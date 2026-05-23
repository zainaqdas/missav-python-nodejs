'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface VideoSummaryData {
  videoCode: string;
  title: string;
  thumbnail: string;
  url: string;
}

interface VideoSummaryCardProps {
  video: VideoSummaryData;
  index?: number;
}

export default function VideoSummaryCard({ video, index = 0 }: VideoSummaryCardProps) {
  const [imageError, setImageError] = useState(false);
  const videoCode = video.videoCode?.toLowerCase() || 'unknown';

  // Proxy thumbnail through our server to avoid fourhoi.com referrer blocking
  const thumbUrl = video.thumbnail?.startsWith('http')
    ? `/api/thumb?url=${encodeURIComponent(video.thumbnail)}`
    : video.thumbnail;

  return (
    <Link
      href={`/video/${encodeURIComponent(videoCode)}`}
      className="group block glass-card rounded-xl overflow-hidden hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-600/10 transition-all duration-300 ease-out animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-surface-lighter">
        {!imageError ? (
          <img
            src={thumbUrl}
            alt={video.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-primary-800"
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

        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300" />

        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-xs font-semibold bg-black/70 text-primary-300 rounded-md backdrop-blur-sm border border-primary-800/30">
            {video.videoCode}
          </span>
        </div>
      </div>

      {/* Info section */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug group-hover:text-primary-300 transition-colors duration-200">
          {video.title || video.videoCode}
        </h3>
      </div>
    </Link>
  );
}
