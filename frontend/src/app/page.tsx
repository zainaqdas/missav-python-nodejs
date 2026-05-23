'use client';

import { useState, useCallback } from 'react';
import type { VideoAttributes } from 'missav-api';
import SearchBar from '@/components/SearchBar';
import VideoGrid from '@/components/VideoGrid';
import Footer from '@/components/Footer';
import { searchVideos } from '@/lib/api';

export default function HomePage() {
  const [videos, setVideos] = useState<VideoAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);

    try {
      const data = await searchVideos(query, 24);
      setVideos(data.results);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setVideos([]);
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-hero-gradient" />

        {/* Decorative glow orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[60%] bg-primary-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[50%] bg-pink-600/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-[20%] w-[20%] h-[30%] bg-rose-500/5 rounded-full blur-[80px]" />

        {/* Hero content */}
        <div className="relative pt-20 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Logo / Title */}
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                <span className="text-gradient">missAV</span>
                <span className="text-gray-300"> Explorer</span>
              </h1>
              <p className="text-lg text-gray-500 font-light max-w-xl mx-auto">
                Discover and browse video metadata with a sleek, modern
                interface
              </p>
            </div>

            {/* Search */}
            <div className="pt-4">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>

            {/* Quick search suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-gray-600 text-xs">Popular:</span>
              {['FC2-PPV', 'JUL', 'STARS', 'STAR', 'ABF'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleSearch(tag)}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs font-medium text-primary-300/70 bg-primary-950/40 border border-primary-800/20 rounded-full hover:bg-primary-900/40 hover:text-primary-300 hover:border-primary-600/30 transition-all duration-200 disabled:opacity-50"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results section */}
      <div className="flex-1 px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 glass-card border border-red-500/30">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-red-400 shrink-0"
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
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <VideoGrid
            videos={videos}
            isLoading={isLoading}
            query={hasSearched ? currentQuery : undefined}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}
