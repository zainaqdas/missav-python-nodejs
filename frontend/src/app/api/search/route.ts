import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'missav-api';
import type { VideoAttributes } from 'missav-api';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client({ timeout: 60, debug: false });
  }
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const { query, count } = (await request.json()) as {
      query?: string;
      count?: number;
    };

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { message: 'Search query is required' },
        { status: 400 }
      );
    }

    const c = getClient();
    const results: VideoAttributes[] = [];
    const videoCount = Math.min(count || 20, 100);

    const generator = c.search(query, { videoCount, maxWorkers: 10 });
    for await (const video of generator) {
      try {
        const attrs = await video.getAllAttributes();
        results.push(attrs);
      } catch (err) {
        console.warn(
          `Skipping video (failed to resolve details): ${err instanceof Error ? err.message : err}`
        );
      }
    }

    // If we got no results at all and the generator finished without error,
    // return the search query info so the UI can show an empty state.
    return NextResponse.json({
      results,
      query: query.trim(),
      count: results.length,
    });
  } catch (error) {
    console.error('Search API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
