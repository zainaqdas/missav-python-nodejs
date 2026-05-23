'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/browse/genres', label: 'Genres' },
    { href: '/browse/makers', label: 'Makers' },
    { href: '/browse/new', label: 'Latest' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-primary-900/20 bg-surface/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-extrabold tracking-tight">
              <span className="text-gradient">missAV</span>
              <span className="text-gray-400 ml-1">Explorer</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm text-gray-400 hover:text-primary-300 hover:bg-primary-950/30 rounded-lg transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-primary-300 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-400 hover:text-primary-300 hover:bg-primary-950/30 rounded-lg transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
