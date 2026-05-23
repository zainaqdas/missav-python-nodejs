# missav-api

Unofficial **Node.js/TypeScript** client for [missav.ws](https://missav.ws) — a Japanese adult video platform. This is a port of the Python [`missAV_api`](https://github.com/EchterAlsFake/missAV_api) package (v1.4.9).

Provides video metadata extraction, search via the Recombee API, and automatic Cloudflare bypass via multiple fallback strategies.

> **Disclaimer:** This API is against the Terms of Service of `missav.ws`. Usage is at your own risk. The author is not liable for damages caused by misuse.

---

## Features

- **Video metadata extraction** — title, publish date, video code, genres, series, manufacturer, thumbnail, HLS stream URL, and more
- **Search** — query missav's internal Recombee API with batched, concurrent video detail resolution
- **Automatic Cloudflare bypass** — three fallback strategies: Python `curl_cffi` → axios → Playwright headless Chromium
- **Caching** — in-memory TTL cache for HTML responses and video attributes
- **Proxy support** — configure HTTP/HTTPS proxies via URL strings
- **TypeScript-first** — full type definitions exported

---

## Installation

```bash
npm install missav-api
```

Or directly from GitHub:

```bash
npm install github:zainaqdas/missav-python-nodejs
```

### Optional: Cloudflare bypass via Python

For the best Cloudflare bypass performance (no headless browser needed):

```bash
pip3 install curl-cffi
```

The library will fall back to Playwright if Python/curl_cffi are unavailable.

---

## Quick Start

```typescript
import { Client } from 'missav-api';

const client = new Client();

// Fetch a video's metadata
const video = await client.getVideo('https://missav.ws/en/fc2-ppv-123456');

console.log(await video.getTitle());
console.log(await video.getAllAttributes());

// Clean up resources (Playwright browser context if used)
await client.close();
```

---

## API Reference

### Client

The main entry point for all API interactions.

```typescript
import { Client } from 'missav-api';

// Default configuration
const client = new Client();

// With custom configuration
const client = new Client({
  timeout: 60,           // request timeout in seconds (default: 30)
  cache: true,           // enable caching (default: true)
  cacheTtl: 300_000,     // cache TTL in ms (default: 5 minutes)
  proxy: 'http://user:pass@host:8080',  // optional HTTP proxy
  debug: true,           // enable debug logging
});
```

#### `getVideo(url: string): Promise<Video>`

Fetch a video by its missAV URL. Returns a `Video` instance with lazy-loaded attributes.

```typescript
const video = await client.getVideo('https://missav.ws/en/fc2-ppv-123456');
```

#### `getVideoAttributes(url: string): Promise<VideoAttributes>`

Convenience method that returns all video attributes in a single call.

```typescript
const attrs = await client.getVideoAttributes('https://missav.ws/en/fc2-ppv-123456');
```

#### `search(query: string, options?): AsyncGenerator<Video>`

Search for videos using missav's Recombee API. Returns an async generator that yields `Video` objects as they are resolved.

```typescript
for await (const video of client.search('FC2', { videoCount: 20 })) {
  console.log(await video.getTitle());
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `videoCount` | `50` | Maximum number of video results |
| `maxWorkers` | `10` | Concurrent workers for resolving video details |

#### `close(): Promise<void>`

Clean up resources (Playwright browser context if used).

```typescript
await client.close();
```

### Video

Represents a single video with lazy-loaded attributes. All getter methods are `async` and cached.

| Method | Returns | Description |
|--------|---------|-------------|
| `getTitle()` | `string` | Video title (language depends on URL path: `/en/` or `/ja/`) |
| `getPublishDate()` | `string` | Publication date |
| `getVideoCode()` | `string` | Video code (e.g., `FC2-PPV-123456`) |
| `getTitleOriginalJapanese()` | `string` | Original Japanese title |
| `getGenres()` | `string[]` | Genre tags |
| `getSeries()` | `string` | Series name |
| `getManufacturer()` | `string` | Manufacturer |
| `getEtiquette()` | `string` | Label/etiquette |
| `getM3u8BaseUrl()` | `string` | HLS master playlist URL |
| `getThumbnail()` | `string` | Thumbnail image URL |
| `getAllAttributes()` | `VideoAttributes` | All attributes in one call |

```typescript
const video = await client.getVideo(url);

const attrs = await video.getAllAttributes();
// {
//   title: '...',
//   publishDate: '2024-01-15',
//   videoCode: 'FC2-PPV-123456',
//   titleOriginalJapanese: '...',
//   genres: ['...', '...'],
//   series: '...',
//   manufacturer: '...',
//   etiquette: '...',
//   m3u8BaseUrl: 'https://.../playlist.m3u8',
//   thumbnail: 'https://.../thumbnail.jpg'
// }
```

### VideoAttributes

```typescript
interface VideoAttributes {
  title: string;
  publishDate: string;
  videoCode: string;
  titleOriginalJapanese: string;
  genres: string[];
  series: string;
  manufacturer: string;
  etiquette: string;
  m3u8BaseUrl: string;
  thumbnail: string;
}
```

---

## How Cloudflare Bypass Works

The `CloudflareFetcher` uses three strategies in order of preference:

1. **Python `curl_cffi` bridge** (primary) — TLS impersonation mimics Chrome's JA3 fingerprint. Fast (~1-2s) and reliable.
2. **Axios** (fallback) — plain HTTP requests. If the page is behind Cloudflare, falls through to Playwright.
3. **Playwright** (last resort) — headless Chromium with stealth script injection to avoid detection.

Python is tried **first** because making a plain HTTP request (axios) to a Cloudflare-protected site can flag the IP, causing even TLS impersonation to fail.

---

## Configuration

### ClientConfig

```typescript
interface ClientConfig {
  timeout?: number;        // seconds (default: 30)
  userAgent?: string;      // custom User-Agent
  proxy?: string;          // proxy URL (e.g. http://user:pass@host:port)
  cache?: boolean;         // enable caching (default: true)
  cacheTtl?: number;       // cache TTL in ms (default: 300000)
  debug?: boolean;         // enable debug logging
}
```

---

## Project Structure

```
missav-api/
├── src/
│   ├── index.ts          # Public API exports
│   ├── types.ts          # TypeScript interfaces
│   ├── constants.ts      # API tokens, defaults
│   ├── cache.ts          # In-memory TTL cache
│   ├── signer.ts         # HMAC-SHA1 signature for Recombee API
│   ├── client.ts         # Main Client class
│   ├── video.ts          # Video metadata scraping
│   ├── fetcher.ts        # Multi-strategy Cloudflare bypass
│   └── fetcher_helper.py # Python curl_cffi bridge
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

---

## License

ISC
