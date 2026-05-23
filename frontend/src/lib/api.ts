import type { VideoAttributes } from 'missav-api';

export interface SearchResponse {
  results: VideoAttributes[];
  query: string;
  count: number;
}

export interface VideoSummary {
  videoCode: string;
  title: string;
  thumbnail: string;
  url: string;
}

export interface BrowseResult {
  videos: VideoSummary[];
  page: number;
  totalPages: number;
  title: string;
}

export interface GenreInfo {
  name: string;
  slug: string;
  url: string;
}

export interface MakerInfo {
  name: string;
  slug: string;
  url: string;
}

export async function searchVideos(
  query: string,
  count: number = 20
): Promise<SearchResponse> {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, count }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        `Search failed: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getVideo(url: string): Promise<VideoAttributes> {
  const response = await fetch(
    `/api/video?url=${encodeURIComponent(url)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ||
        `Failed to fetch video: ${response.statusText}`
    );
  }

  return response.json();
}

/** Get list of all genres */
export async function getGenres(): Promise<GenreInfo[]> {
  const response = await fetch('/api/genres');
  if (!response.ok) throw new Error('Failed to fetch genres');
  const data = await response.json();
  return data.genres || [];
}

/** Browse videos by type: genre, maker, or new */
export async function browseVideos(
  type: 'genre' | 'maker' | 'new',
  slug?: string,
  page: number = 1
): Promise<BrowseResult> {
  let url = `/api/browse?type=${type}&page=${page}`;
  if (slug) url += `&slug=${encodeURIComponent(slug)}`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to browse videos'
    );
  }

  return response.json();
}

/** Get related videos for a video page */
export async function getRelatedVideos(url: string): Promise<VideoSummary[]> {
  const response = await fetch(
    `/api/video/related?url=${encodeURIComponent(url)}`
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to fetch related videos'
    );
  }

  const data = await response.json();
  return data.videos || [];
}
