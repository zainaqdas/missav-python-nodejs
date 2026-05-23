import { NextResponse } from 'next/server';
import { Client } from 'missav-api';

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client({ timeout: 30, debug: false });
  }
  return client;
}

export async function GET() {
  try {
    const c = getClient();
    const genres = await c.getGenreList();

    return NextResponse.json({ genres, count: genres.length });
  } catch (error) {
    console.error('Genres API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
