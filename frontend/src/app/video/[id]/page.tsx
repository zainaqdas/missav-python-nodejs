'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { VideoAttributes } from 'missav-api';
import { getVideo } from '@/lib/api';

interface VideoPageProps {
  params: Promise<{ id: string }>;
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="glass-card rounded-lg px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-200">{value}</p>
    </div>
  );
}

export default function VideoPage({ params }: VideoPageProps) {
  const { id } = use(params);
  const [video, setVideo] = useState<VideoAttributes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `https://missav.ws/en/${id}`;
        const data = await getVideo(url);
        setVideo(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch video'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading video details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-950/50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
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
          </div>
          <h2 className="text-xl font-semibold text-gray-300">
            Failed to load video
          </h2>
          <p className="text-sm text-gray-500">{error}</p>
          <Link href="/" className="btn-primary inline-block mt-4">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="min-h-screen bg-surface">
      {/* Back navigation */}
      <div className="border-b border-primary-900/20">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            Back to results
          </Link>
        </div>
      </div>

      {/* Video content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Thumbnail */}
          <div className="glass-card rounded-2xl overflow-hidden">
            {!imageError ? (
              <img
                src={video.thumbnail}
                alt={video.title}
                onError={() => setImageError(true)}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-surface-lighter">
                <svg
                  className="w-16 h-16 text-primary-800"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white leading-snug">
                {video.title}
              </h1>
              {video.titleOriginalJapanese && (
                <p className="mt-2 text-base text-gray-400">
                  {video.titleOriginalJapanese}
                </p>
              )}
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetaItem label="Video Code" value={video.videoCode} />
              <MetaItem label="Release Date" value={video.publishDate} />
              {video.series && (
                <MetaItem label="Series" value={video.series} />
              )}
              {video.manufacturer && (
                <MetaItem label="Manufacturer" value={video.manufacturer} />
              )}
              {video.etiquette && (
                <MetaItem label="Label" value={video.etiquette} />
              )}
            </div>

            {/* Genres */}
            {video.genres && video.genres.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {video.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1.5 text-xs font-medium bg-primary-950/50 text-primary-200/80 rounded-full border border-primary-800/20 hover:bg-primary-900/50 hover:border-primary-600/30 transition-all duration-200"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* HLS Stream URL */}
            {video.m3u8BaseUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">
                  HLS Stream
                </h3>
                <div className="p-3 bg-surface-lighter rounded-lg border border-primary-900/20">
                  <p className="text-xs text-gray-500 font-mono break-all">
                    {video.m3u8BaseUrl}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
