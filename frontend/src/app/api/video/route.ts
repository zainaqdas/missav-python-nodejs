import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'missav-api';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client({ timeout: 60, debug: false });
  }
  return client;
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { message: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const c = getClient();
    const attrs = await c.getVideoAttributes(url);

    return NextResponse.json(attrs);
  } catch (error) {
    console.error('Video API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
