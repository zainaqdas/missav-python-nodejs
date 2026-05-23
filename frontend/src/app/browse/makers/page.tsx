'use client';

import { useState } from 'react';
import Link from 'next/link';

const popularMakers = [
  { name: '1pondo', slug: '1pondo' },
  { name: 'HEYZO', slug: 'heyzo' },
  { name: 'Tokyo Hot', slug: 'tokyohot' },
  { name: 'Caribbeancom', slug: 'caribbeancom' },
  { name: 'Caribbeancompr', slug: 'caribbeancompr' },
  { name: '10musume', slug: '10musume' },
  { name: 'Pacopacomama', slug: 'pacopacomama' },
  { name: 'Gachinco', slug: 'gachinco' },
  { name: 'Siro', slug: 'siro' },
  { name: 'FC2', slug: 'fc2' },
  { name: 'Madou', slug: 'madou' },
  { name: 'Luxu', slug: 'luxu' },
  { name: 'ARA', slug: 'ara' },
  { name: 'Naughty4610', slug: 'naughty4610' },
  { name: 'Naughty0930', slug: 'naughty0930' },
  { name: 'Marriedslash', slug: 'marriedslash' },
  { name: 'Scute', slug: 'scute' },
  { name: 'Gana', slug: 'gana' },
  { name: 'TWAV', slug: 'twav' },
  { name: 'Furuke', slug: 'furuke' },
  { name: 'Maan', slug: 'maan' },
  { name: 'XXX-AV', slug: 'xxxav' },
  { name: 'English Subtitle', slug: 'english-subtitle' },
  { name: 'Uncensored Leak', slug: 'uncensored-leak' },
];

export default function MakersPage() {
  const [search, setSearch] = useState('');

  const filtered = popularMakers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Makers &amp; Studios</h1>
          <p className="text-gray-500 mt-2">
            Browse videos by studio or maker
          </p>
          <div className="mt-6 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search makers..."
              className="w-full bg-surface-card/90 border border-primary-900/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/60 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((maker) => (
            <Link
              key={maker.slug}
              href={`/browse/makers/${maker.slug}`}
              className="glass-card rounded-xl px-5 py-4 text-center hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-600/5 transition-all duration-300 group"
            >
              <p className="text-sm font-medium text-gray-300 group-hover:text-primary-300 transition-colors">
                {maker.name}
              </p>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500">No makers found matching &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
