'use client';

import { useEffect, useRef, useState } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: any = null;
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    // Build proxy URL
    const proxyUrl = src.startsWith('http')
      ? `/api/hls?url=${encodeURIComponent(src)}`
      : src;

    const initPlayer = () => {
      playerRef.current = new Plyr(video, {
        controls: [
          'play-large',
          'rewind',
          'play',
          'fast-forward',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'fullscreen',
        ],
        settings: ['speed'],
        speed: {
          selected: 1,
          options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        },
        seekTime: 10,
        ratio: '16:9',
        resetOnEnd: true,
        fullscreen: { enabled: true, fallback: true, iosNative: true },
        keyboard: { focused: true, global: true },
        tooltips: { controls: true, seek: true },
        storage: { enabled: true, key: 'plyr' },
      });
      setIsLoading(false);
    };

    const startPlayback = async () => {
      try {
        if (src.endsWith('.m3u8')) {
          const Hls = (await import('hls.js')).default;

          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 30,
            });
            hls.loadSource(proxyUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              initPlayer();
              video.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
              if (data.fatal) {
                setError('Failed to load video stream');
                setIsLoading(false);
              }
            });

            // Safety timeout: remove loading overlay after 20s even if manifest hasn't parsed
            const loadingTimeout = setTimeout(() => {
              setIsLoading(false);
            }, 20000);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              clearTimeout(loadingTimeout);
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS (Safari)
            video.src = proxyUrl;
            video.addEventListener('loadedmetadata', () => {
              initPlayer();
              video.play().catch(() => {});
            });
          } else {
            setError('HLS is not supported in this browser');
            setIsLoading(false);
          }
        } else {
          // Direct video file
          video.src = proxyUrl;
          video.addEventListener('loadedmetadata', () => {
            initPlayer();
            video.play().catch(() => {});
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize player');
        setIsLoading(false);
      }
    };

    startPlayback();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (hls) {
        hls.destroy();
      }
      video.removeAttribute('src');
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
      {/* Video element — Plyr will attach its controls here */}
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={poster}
        playsInline
        preload="metadata"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center max-w-md px-6">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
            <p className="text-xs text-gray-500 mt-2">The stream URL may be expired or unavailable.</p>
          </div>
        </div>
      )}
    </div>
  );
}
