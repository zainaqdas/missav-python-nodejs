'use client';

import type { VideoAttributes } from 'missav-api';
import VideoCard from './VideoCard';

interface VideoGridProps {
  videos: VideoAttributes[];
  isLoading?: boolean;
  query?: string;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="glass-card rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-video shimmer-bg" />
          <div className="p-4 space-y-3">
            <div className="h-4 shimmer-bg rounded w-3/4" />
            <div className="h-3 shimmer-bg rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-5 w-16 shimmer-bg rounded-full" />
              <div className="h-5 w-20 shimmer-bg rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ query }: { query?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 mb-6 rounded-full bg-surface-lighter flex items-center justify-center">
        <svg
          className="w-10 h-10 text-primary-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>
      {query ? (
        <>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No results found
          </h3>
          <p className="text-gray-500 max-w-md">
            No videos found for &ldquo;{query}&rdquo;. Try a different search
            term.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            Discover videos
          </h3>
          <p className="text-gray-500 max-w-md">
            Search for videos using codes like{' '}
            <span className="text-primary-400 font-mono">FC2-PPV</span>,{' '}
            <span className="text-primary-400 font-mono">JUL</span>, or{' '}
            <span className="text-primary-400 font-mono">STARS</span>
          </p>
        </>
      )}
    </div>
  );
}

export default function VideoGrid({
  videos,
  isLoading,
  query,
}: VideoGridProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (videos.length === 0) return <EmptyState query={query} />;

  return (
    <div>
      {query && (
        <p className="text-sm text-gray-400 mb-5">
          Found{' '}
          <span className="text-primary-300 font-medium">
            {videos.length}
          </span>{' '}
          results for{' '}
          <span className="text-gray-200 font-medium">
            &ldquo;{query}&rdquo;
          </span>
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {videos.map((video, index) => (
          <VideoCard
            key={`${video.videoCode}-${index}`}
            video={video}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
