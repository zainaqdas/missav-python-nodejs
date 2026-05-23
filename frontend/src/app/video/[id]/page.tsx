'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { VideoAttributes } from 'missav-api';
import { getVideo, getRelatedVideos } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';
import VideoCard from '@/components/VideoCard';

interface VideoPageProps {
  params: Promise<{ id: string }>;
}

interface RelatedVideo {
  videoCode: string;
  title: string;
  thumbnail: string;
  url: string;
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
  const [relatedVideos, setRelatedVideos] = useState<RelatedVideo[]>([]);

  useEffect(() => {
    const fetchVideo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `https://missav.ws/en/${id}`;
        const data = await getVideo(url);
        setVideo(data);

        // Also fetch related videos
        getRelatedVideos(url).then(setRelatedVideos).catch(() => {});
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
        <div className="max-w-7xl mx-auto px-6 py-4">
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
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content: Player + Metadata */}
          <div className="lg:col-span-2 space-y-8">
            {/* Video Player */}
            {video.m3u8BaseUrl ? (
              <VideoPlayer
                src={video.m3u8BaseUrl}
                poster={!imageError ? video.thumbnail : undefined}
              />
            ) : !imageError ? (
              <div className="glass-card rounded-2xl overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  onError={() => setImageError(true)}
                  className="w-full aspect-video object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center glass-card rounded-2xl">
                <svg className="w-16 h-16 text-primary-800" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
            )}

            {/* Title & metadata below player */}
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

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href={video.m3u8BaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600/20 text-primary-300 text-sm font-medium hover:bg-primary-600/30 border border-primary-600/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Stream
              </a>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetaItem label="Video Code" value={video.videoCode} />
              <MetaItem label="Release Date" value={video.publishDate} />
              {video.duration && (
                <MetaItem
                  label="Duration"
                  value={`${Math.floor(video.duration / 60)}m ${video.duration % 60}s`}
                />
              )}
              {video.series && <MetaItem label="Series" value={video.series} />}
              {video.manufacturer && <MetaItem label="Manufacturer" value={video.manufacturer} />}
              {video.etiquette && <MetaItem label="Label" value={video.etiquette} />}
            </div>

            {/* Genres */}
            {video.genres && video.genres.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {video.genres.map((genre) => (
                    <Link
                      key={genre}
                      href={`/browse/genres/${genre.toLowerCase().replace(/\s+/g, '-')}`}
                      className="px-3 py-1.5 text-xs font-medium bg-primary-950/50 text-primary-200/80 rounded-full border border-primary-800/20 hover:bg-primary-900/50 hover:border-primary-600/30 transition-all duration-200"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Related Videos */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-lg font-semibold text-gray-200 mb-5">Related Videos</h3>

              {relatedVideos.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-600">No related videos found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {relatedVideos.slice(0, 12).map((rv, index) => (
                    <Link
                      key={`${rv.videoCode}-${index}`}
                      href={`/video/${encodeURIComponent(rv.videoCode)}`}
                      className="group flex gap-3 glass-card rounded-xl p-2 hover:border-primary-500/30 transition-all duration-200"
                    >
                      {/* Thumbnail */}
                      <div className="w-24 h-16 shrink-0 rounded-lg overflow-hidden bg-surface-lighter">
                        {rv.thumbnail ? (
                          <img
                            src={rv.thumbnail}
                            alt={rv.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary-800" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-xs text-primary-300 font-medium truncate">{rv.videoCode}</p>
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-snug group-hover:text-primary-300 transition-colors">
                          {rv.title}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
