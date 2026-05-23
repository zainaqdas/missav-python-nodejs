'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

export default function SearchBar({
  onSearch,
  isLoading,
  initialValue = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div
        className={`relative flex items-center gap-2 transition-all duration-300 ease-out ${
          focused ? 'scale-[1.02]' : 'scale-100'
        }`}
      >
        {/* Glow behind input */}
        <div
          className={`absolute -inset-1 rounded-2xl transition-opacity duration-500 bg-gradient-to-r from-primary-600/20 via-pink-600/20 to-primary-600/20 blur-xl ${
            focused ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Input container */}
        <div
          className={`relative flex items-center w-full bg-surface-card/90 backdrop-blur-md border rounded-xl overflow-hidden transition-all duration-300 ${
            focused
              ? 'border-primary-500/60 shadow-lg shadow-primary-600/20'
              : 'border-primary-900/30 hover:border-primary-700/40'
          }`}
        >
          {/* Search icon */}
          <div className="flex items-center justify-center pl-4">
            <svg
              className={`w-5 h-5 transition-colors duration-200 ${
                focused ? 'text-primary-400' : 'text-gray-500'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search videos... (e.g. FC2-PPV, JUL, STARS)"
            className="flex-1 bg-transparent px-4 py-4 text-white placeholder-gray-500 text-base focus:outline-none font-light tracking-wide"
            disabled={isLoading}
          />

          {/* Clear button */}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex items-center justify-center px-3 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Search button */}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="flex items-center gap-2 px-5 py-4 mx-1 my-1 rounded-lg bg-gradient-to-r from-primary-600 to-pink-600 hover:from-primary-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-medium text-sm transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            )}
            <span className="hidden sm:inline">
              {isLoading ? 'Searching...' : 'Search'}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}
