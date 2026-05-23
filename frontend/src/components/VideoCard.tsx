'use client';

import Link from 'next/link';
import type { VideoAttributes } from 'missav-api';
import { useState } from 'react';

interface VideoCardProps {
  video: VideoAttributes;
  index?: number;
}

export default function VideoCard({ video, index = 0 }: VideoCardProps) {
  const [imageError, setImageError] = useState(false);
  const videoCode = video.videoCode?.toLowerCase() || 'unknown';

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
            src={video.thumbnail}
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

        {/* Gradient hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300" />

        {/* Video code badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-xs font-semibold bg-black/70 text-primary-300 rounded-md backdrop-blur-sm border border-primary-800/30">
            {video.videoCode}
          </span>
        </div>
      </div>

      {/* Info section */}
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug group-hover:text-primary-300 transition-colors duration-200">
          {video.title}
        </h3>

        {video.publishDate && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
            {video.publishDate}
          </div>
        )}

        {/* Genre tags */}
        {video.genres && video.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {video.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="px-2 py-0.5 text-[10px] font-medium bg-primary-950/60 text-primary-300/80 rounded-full border border-primary-800/20"
              >
                {genre}
              </span>
            ))}
            {video.genres.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] text-gray-500">
                +{video.genres.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
