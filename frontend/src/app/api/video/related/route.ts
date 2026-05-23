import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'missav-api';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client({ timeout: 30, debug: false });
  }
  return client;
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { message: 'url parameter is required' },
        { status: 400 }
      );
    }

    const c = getClient();
    const related = await c.getRelatedVideos(url);

    return NextResponse.json({ videos: related, count: related.length });
  } catch (error) {
    console.error('Related videos API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
