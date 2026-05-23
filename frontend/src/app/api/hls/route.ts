import { NextRequest, NextResponse } from 'next/server';

/**
 * Headers required by surrit.com CDN to allow access.
 * The CDN checks Referer to verify the request comes from missav.ws.
 */
const UPSTREAM_HEADERS = {
  Referer: 'https://missav.ws/',
  Origin: 'https://missav.ws',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: '*/*',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

/**
 * Rewrite all URI lines in an m3u8 playlist to route through this proxy.
 * This handles both simple segment files (.ts) and variant playlists.
 *
 * An m3u8 line that is a URI (doesn't start with #) gets rewritten to:
 *   /api/hls?url=<encoded-absolute-url>
 */
function rewriteM3u8(body: string, baseUrl: URL): string {
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      try {
        const resolved = new URL(trimmed, baseUrl).toString();
        // Only proxy surrit.com URLs (safety check)
        if (!resolved.startsWith('https://surrit.com/')) return line;
        return `/api/hls?url=${encodeURIComponent(resolved)}`;
      } catch {
        return line; // unparseable — leave as-is
      }
    })
    .join('\n');
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  // Safety: only proxy surrit.com URLs (prevent SSRF)
  if (!url.startsWith('https://surrit.com/')) {
    return NextResponse.json({ error: 'URL domain not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, { headers: UPSTREAM_HEADERS });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}: ${upstream.statusText}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest =
      url.endsWith('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('m3u8');

    if (isManifest) {
      // Rewrite segment/variant URIs inside the m3u8 to go through proxy
      const body = await upstream.text();
      const baseUrl = new URL(url);
      const rewritten = rewriteM3u8(body, baseUrl);

      return new NextResponse(rewritten, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=30',
        },
      });
    }

    // Binary segment (.ts, .aac, etc.) — pipe through
    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType || 'video/mp2t',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=3600',
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
