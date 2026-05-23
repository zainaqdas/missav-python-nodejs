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
    const type = request.nextUrl.searchParams.get('type') || 'new';
    const slug = request.nextUrl.searchParams.get('slug') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);

    const c = getClient();
    let result;

    switch (type) {
      case 'genre':
        if (!slug) {
          return NextResponse.json(
            { message: 'slug parameter is required for genre browse' },
            { status: 400 }
          );
        }
        result = await c.browseGenre(slug, page);
        break;

      case 'maker':
        if (!slug) {
          return NextResponse.json(
            { message: 'slug parameter is required for maker browse' },
            { status: 400 }
          );
        }
        result = await c.browseMaker(slug, page);
        break;

      case 'new':
      default:
        result = await c.browseNew(page);
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Browse API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
