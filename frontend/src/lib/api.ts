import type { VideoAttributes } from 'missav-api';

export interface SearchResponse {
  results: VideoAttributes[];
  query: string;
  count: number;
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
