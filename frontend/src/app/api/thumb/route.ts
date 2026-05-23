import { NextRequest, NextResponse } from 'next/server';

/**
 * Headers required by fourhoi.com CDN to allow access.
 * The CDN checks Referer to verify the request comes from missav.ws.
 */
const UPSTREAM_HEADERS = {
  Referer: 'https://missav.ws/',
  Origin: 'https://missav.ws',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

// Cache image responses for 1 hour, allow CDN caching for 1 day
const CACHE_HEADERS = 'public, max-age=3600, s-maxage=86400, immutable';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  // Safety: only proxy fourhoi.com URLs (prevent SSRF)
  if (!url.startsWith('https://fourhoi.com/')) {
    return NextResponse.json({ error: 'URL domain not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, { headers: UPSTREAM_HEADERS });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': CACHE_HEADERS,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}
