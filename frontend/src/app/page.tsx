'use client';

import { useState, useCallback, useEffect } from 'react';
import type { VideoAttributes } from 'missav-api';
import SearchBar from '@/components/SearchBar';
import VideoGrid from '@/components/VideoGrid';
import VideoCard from '@/components/VideoCard';
import Footer from '@/components/Footer';
import { searchVideos, browseVideos } from '@/lib/api';

const POPULAR_TAGS = ['FC2-PPV', 'JUL', 'STARS', 'STAR', 'ABF', 'Heyzo', 'Caribbeancom', '1pondo'];

export default function HomePage() {
  const [videos, setVideos] = useState<VideoAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [latestVideos, setLatestVideos] = useState<VideoAttributes[]>([]);
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);

  // Fetch latest videos on mount
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'FC2-PPV', count: 8 }),
        });
        if (res.ok) {
          const data = await res.json();
          setLatestVideos(data.results || []);
        }
      } catch {
        // Non-critical
      } finally {
        setIsLoadingLatest(false);
      }
    };
    fetchLatest();
  }, []);

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
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[60%] bg-primary-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[50%] bg-pink-600/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-[20%] w-[20%] h-[30%] bg-rose-500/5 rounded-full blur-[80px]" />

        <div className="relative pt-20 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                <span className="text-gradient">missAV</span>
                <span className="text-gray-300"> Explorer</span>
              </h1>
              <p className="text-lg text-gray-500 font-light max-w-xl mx-auto">
                Discover, browse, and stream videos with a modern interface
              </p>
            </div>

            <div className="pt-4">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-gray-600 text-xs">Popular:</span>
              {POPULAR_TAGS.map((tag) => (
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
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
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

          {/* Browse quick links when no search results shown */}
          {!hasSearched && !isLoading && (
            <div className="mt-12 space-y-12">
              {/* Quick navigation cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a href="/browse/genres" className="glass-card rounded-2xl p-6 text-center hover:border-primary-500/40 transition-all duration-300 group">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-950/50 flex items-center justify-center group-hover:bg-primary-900/50 transition-colors">
                    <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-200 group-hover:text-primary-300 transition-colors">Browse Genres</h3>
                  <p className="text-sm text-gray-500 mt-2">Explore videos by genre</p>
                </a>

                <a href="/browse/makers" className="glass-card rounded-2xl p-6 text-center hover:border-primary-500/40 transition-all duration-300 group">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-950/50 flex items-center justify-center group-hover:bg-primary-900/50 transition-colors">
                    <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m-9.58-8.92A2.25 2.25 0 0 0 3 10.5v4.286c0 1.136.847 2.1 1.98 2.193.34.027.68.052 1.02.072v3.091l3-3c.833.172 1.68.3 2.542.357" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-200 group-hover:text-primary-300 transition-colors">Browse Makers</h3>
                  <p className="text-sm text-gray-500 mt-2">Explore videos by studio</p>
                </a>

                <a href="/browse/new" className="glass-card rounded-2xl p-6 text-center hover:border-primary-500/40 transition-all duration-300 group">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-950/50 flex items-center justify-center group-hover:bg-primary-900/50 transition-colors">
                    <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-200 group-hover:text-primary-300 transition-colors">Latest Releases</h3>
                  <p className="text-sm text-gray-500 mt-2">Recently added videos</p>
                </a>
              </div>

              {/* Trending / Recent */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Recent Videos</h2>
                  <a href="/browse/new" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">View all →</a>
                </div>

                {isLoadingLatest ? (
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
                ) : latestVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {latestVideos.map((video, index) => (
                      <VideoCard key={`${video.videoCode}-${index}`} video={video} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No recent videos to show. Try searching above!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
