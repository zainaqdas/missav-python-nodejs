'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Genre {
  name: string;
  slug: string;
}

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch('/api/genres');
        if (!res.ok) throw new Error('Failed to fetch genres');
        const data = await res.json();
        setGenres(data.genres || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load genres');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGenres();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading genres...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Link href="/" className="btn-primary inline-block">Back Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Genres</h1>
          <p className="text-gray-500 mt-2">
            Browse videos by genre — {genres.length} genres available
          </p>
        </div>

        {/* Genre grid */}
        {genres.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No genres found. Try again later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {genres.map((genre) => (
              <Link
                key={genre.slug}
                href={`/browse/genres/${genre.slug}`}
                className="glass-card rounded-xl px-5 py-4 text-center hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-600/5 transition-all duration-300 group"
              >
                <p className="text-sm font-medium text-gray-300 group-hover:text-primary-300 transition-colors capitalize">
                  {genre.name}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
