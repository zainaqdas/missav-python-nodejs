'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
}

export default function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: any = null;
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    const startPlayback = async () => {
      try {
        // Proxy HLS streams through our server to avoid CORS and Referer blocking
        const proxyUrl = src.startsWith('http')
          ? `/api/hls?url=${encodeURIComponent(src)}`
          : src;

        if (src.endsWith('.m3u8')) {
          // Use hls.js for HLS streams
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
              setIsLoading(false);
              video.play().catch(() => {
                // Autoplay blocked — user will need to click play
              });
            });
            hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
              if (data.fatal) {
                setError('Failed to load video stream');
                setIsLoading(false);
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = proxyUrl;
            video.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
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
            setIsLoading(false);
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
      if (hls) {
        hls.destroy();
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group">
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        poster={poster}
        controls
        playsInline
        preload="metadata"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
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

      {/* Title overlay (bottom) */}
      {title && !isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-sm text-white font-medium truncate">{title}</p>
        </div>
      )}
    </div>
  );
}
