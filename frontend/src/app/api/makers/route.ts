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
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const c = getClient();
    const makers = await c.getMakerList(page);

    return NextResponse.json({ makers, count: makers.length });
  } catch (error) {
    console.error('Makers API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
