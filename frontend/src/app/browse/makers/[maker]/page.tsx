'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import VideoSummaryCard from '@/components/VideoSummaryCard';
import type { VideoSummaryData } from '@/components/VideoSummaryCard';

interface MakerPageProps {
  params: Promise<{ maker: string }>;
}

export default function MakerVideosPage({ params }: MakerPageProps) {
  const { maker } = use(params);
  const [videos, setVideos] = useState<VideoSummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPage = async (pageNum: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const browseRes = await fetch(`/api/browse?type=maker&slug=${encodeURIComponent(maker)}&page=${pageNum}`);
      if (!browseRes.ok) throw new Error('Failed to fetch maker page');
      const browseData = await browseRes.json();
      setTotalPages(browseData.totalPages || 1);
      setVideos(browseData.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(page);
  }, [maker, page]);

  const decodedMaker = decodeURIComponent(maker);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-primary-300 transition-colors">Home</Link>
          <span className="text-sm text-gray-600 mx-2">/</span>
          <Link href="/browse/makers" className="text-sm text-gray-500 hover:text-primary-300 transition-colors">Makers</Link>
          <span className="text-sm text-gray-600 mx-2">/</span>
          <span className="text-sm text-gray-300 capitalize">{decodedMaker}</span>
        </div>

        <h1 className="text-3xl font-bold text-white capitalize mb-8">{decodedMaker}</h1>

        {error && (
          <div className="mb-6 p-4 glass-card border border-red-500/30">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video shimmer-bg" />
                <div className="p-4 space-y-3">
                  <div className="h-4 shimmer-bg rounded w-3/4" />
                  <div className="h-3 shimmer-bg rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No videos found for this maker.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {videos.map((video, index) => (
                <VideoSummaryCard key={`${video.videoCode}-${index}`} video={video} index={index} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm glass-card hover:border-primary-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm glass-card hover:border-primary-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
