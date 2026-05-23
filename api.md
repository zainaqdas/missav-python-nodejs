# missAV API — In-Depth Documentation

> How the `missav-api` Node.js/TypeScript package works under the hood.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [The Cloudflare Problem](#the-cloudflare-problem)
- [CloudflareFetcher: TLS Impersonation with curl_cffi](#cloudflarefetcher-tls-impersonation-with-curl_cffi)
- [Caching System](#caching-system)
- [Video Metadata Extraction](#video-metadata-extraction)
  - [M3U8 URL Reconstruction](#m3u8-url-reconstruction)
  - [HTML Parsing Strategy](#html-parsing-strategy)
- [Search: The Recombee API](#search-the-recombee-api)
  - [HMAC Request Signing](#hmac-request-signing)
- [Listing Page Scraping](#listing-page-scraping)
  - [Video Code Detection](#video-code-detection)
  - [Thumbnail Extraction](#thumbnail-extraction)
- [Complete Class Reference](#complete-class-reference)
  - [Client](#client)
  - [Video](#video)
  - [Cache](#cache)
  - [CloudflareFetcher](#cloudflarefetcher)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Error Handling](#error-handling)

---

## Overview

`missav-api` is an unofficial Node.js/TypeScript scraper for missav.ws. It:

1. **Bypasses Cloudflare** using Python's `curl_cffi` library with Chrome TLS fingerprint impersonation
2. **Extracts video metadata** by parsing HTML with cheerio
3. **Decodes obfuscated HLS stream URLs** embedded in inline JavaScript
4. **Searches videos** via the Recombee recommendation API with HMAC-signed requests
5. **Browses listings** by scraping genre, maker, and latest-releases pages

It was ported from the Python `missAV_api` package by EchterAlsFake, but re-architected for Node.js with a different Cloudflare bypass strategy.

---

## Architecture

```
                   ┌──────────────────────────────────┐
                   │         missav.ws Server          │
                   │    (behind Cloudflare protection)  │
                   └──────┬──────────────────────┬─────┘
                          │                      │
              ┌───────────▼──────────┐  ┌────────▼───────────┐
              │   Browser (Chrome)    │  │  Recombee API       │
              │   TLS fingerprint     │  │  (search backend)   │
              └───────────┬───────────┘  └────────▲───────────┘
                          │                        │
              ┌───────────▼────────────────────────┴───────────┐
              │               missav-api Client                │
              │                                                │
              │  ┌──────────────────────────────────────────┐  │
              │  │         CloudflareFetcher                 │  │
              │  │  spawns → python3 fetcher_helper.py <url> │  │
              │  │           ↓                               │  │
              │  │    curl_cffi (Chrome TLS impersonation)   │  │
              │  └──────────────────────────────────────────┘  │
              │                                                │
              │  ┌──────────────────────┐  ┌────────────────┐ │
              │  │        Video          │  │    Cache        │ │
              │  │  (lazy-loaded attrs)  │  │  (in-memory,   │ │
              │  │   + m3u8 extraction   │  │   TTL-based)   │ │
              │  └──────────────────────┘  └────────────────┘ │
              │                                                │
              │  ┌──────────────────────────────────────────┐  │
              │  │         signer.ts (HMAC-SHA1)            │  │
              │  │  Signs Recombee API paths for search      │  │
              │  └──────────────────────────────────────────┘  │
              └────────────────────────────────────────────────┘
```

There are **two separate request paths**:

1. **Scraping** (video pages, genre pages, maker listings) → goes through `CloudflareFetcher` → Python `curl_cffi` → Cloudflare → missav.ws
2. **Search** → goes through `axios` directly to Recombee API (different domain, no Cloudflare). No TLS impersonation needed. HMAC-signed for authentication.

---

## The Cloudflare Problem

missav.ws is behind Cloudflare's JS challenge protection. When you make a plain HTTP request (via `axios`, `fetch`, or `curl`) to missav.ws, Cloudflare responds with a challenge page containing JavaScript that must execute in a real browser to set the `cf_clearance` cookie.

```
GET /en/fc2-ppv-123456  →  Cloudflare  →  200 OK (but HTML body is "Just a moment...")
```

This blocks all standard HTTP clients. There are three common solutions:

| Approach | Pros | Cons |
|----------|------|------|
| **Playwright** (full browser) | Handles any challenge | ~400MB install, 5-10s cold start, heavy |
| **cloudscraper** (Python) | Lightweight | Often detected, inconsistent |
| **curl_cffi** | ~1-2s per request, lightweight, no browser | Python dependency, FFI library |

We chose **curl_cffi** — it impersonates Chrome's TLS/JA3 fingerprint at the libcurl level. Cloudflare sees the exact TLS handshake pattern of a real Chrome browser and lets the request through on the first attempt, without ever serving a challenge page.

---

## CloudflareFetcher: TLS Impersonation with curl_cffi

### File: `src/fetcher.ts`

The `CloudflareFetcher` class delegates all HTTP requests to a Python helper script via `child_process.execFile`.

#### Request Flow

```
CloudflareFetcher.fetch(url)
         │
         ▼
  ┌──────────────────┐
  │  execFileAsync    │
  │    "python3"      │
  │  fetcher_helper.py│
  │      <url>        │
  └─────────┬────────┘
            │
            ▼
  ┌──────────────────────┐
  │  fetcher_helper.py    │
  │                       │
  │  requests.get(url,    │
  │    impersonate="chrome",│
  │    headers={...},     │
  │    timeout=30)        │
  │                       │
  │  Prints HTML to stdout│
  └──────────────────────┘
            │
            ▼
  CloudflareFetcher receives HTML
  (or throws on error)
```

#### Retry Logic

The Python helper retries up to **3 times** with a 2-second delay between attempts if it detects a Cloudflare challenge (the string `"Just a moment"` in the response body):

```python
for attempt in range(3):
    resp = requests.get(url, impersonate="chrome", headers=headers, timeout=30)
    if "Just a moment" not in resp.text:
        return resp.text
    time.sleep(2)
raise RuntimeError("Cloudflare challenge could not be resolved")
```

#### Python Binary Resolution

The `resolvePythonBinary()` function searches for a Python 3 binary in priority order:

1. `<project_root>/bin/python3` (virtual environment at project root — common for Ubuntu 24+ where system-wide pip is restricted by PEP 668)
2. `<cwd>/bin/python3` (venv in current working directory)
3. `<dist_dir>/../bin/python3` (venv relative to compiled dist/)
4. `python3` (system PATH — fallback)

#### Python Script Path Resolution

The `resolvePythonScript()` function tries multiple locations to find `fetcher_helper.py`:

1. Relative to the compiled `dist/` directory (`dist/../src/fetcher_helper.py`) — works when installed from npm
2. Relative to `process.cwd()` — works when Next.js bundles the code (__dirname points into `.next/`)
3. One level up from cwd — works when running from `frontend/` directory
4. Inside `node_modules/missav-api/` — works for the deployed npm package

---

## Caching System

### File: `src/cache.ts`

A simple in-memory cache with TTL (time-to-live) support.

```typescript
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
```

#### Key Behaviors

- **Default TTL**: 5 minutes (300,000 ms)
- **Lazy expiration**: Expired entries are deleted on read (`get()` / `has()`), not by a background sweep
- **Cache disabled**: When `cache: false` in config, a `Cache` with `TTL: 0` is created — entries expire immediately
- **Cache keys**: Pages are cached with keys like `page:https://missav.ws/en/new`, video HTML with `html:https://missav.ws/en/fc2-ppv-123456`

The cache is used for:
- Full page HTML (reduces scraping load on missav.ws)
- Video attribute results (cached inside the `Video` object's lazy getters)

---

## Video Metadata Extraction

### File: `src/video.ts`

The `Video` class represents a single missav video page. It uses **lazy loading** with a promise guard to prevent duplicate concurrent fetches.

#### Lazy Loading & Concurrency Guard

```typescript
private loadingPromise: Promise<void> | null = null;

private async ensureLoaded(): Promise<void> {
  if (this.html) return;               // Already loaded
  if (this.loadingPromise) {           // Fetch in progress → wait
    return this.loadingPromise;
  }

  // Check cache first
  const cached = this.cache.get<string>(`html:${this.url}`);
  if (cached) { this.html = cached; return; }

  // Fetch with concurrency guard
  this.loadingPromise = (async () => {
    const html = await this.fetcher.fetch(this.url);
    this.html = html;
    this.$ = cheerio.load(html);
    this.cache.set(`html:${this.url}`, html);
  })();

  try { await this.loadingPromise; }
  finally { this.loadingPromise = null; }
}
```

This means if `getTitle()` and `getM3u8BaseUrl()` are called in parallel (via `Promise.all`), they share the same fetch — the page is downloaded only once.

#### HTML Parsing Strategy

The metadata is extracted from `div.space-y-2 > div.text-secondary` elements. This container holds the structured metadata rows:

```
div.space-y-2
  ├── div.text-secondary  [0]  →  Publish date  →  <time class="font-medium">
  ├── div.text-secondary  [1]  →  Video code    →  <span class="font-medium">
  ├── div.text-secondary  [2]  →  Japanese title →  <span class="font-medium">
  ├── div.text-secondary  [3]  →  Genres        →  <a> tags (multiple)
  ├── div.text-secondary  [4]  →  Series        →  <a> tag
  ├── div.text-secondary  [5]  →  Manufacturer  →  <a> tag (href leads to maker page)
  └── div.text-secondary  [6]  →  Tag           →  <span class="font-medium">
```

Each `get*()` method targets the correct index via `.eq(N)`:

| Method | Index | Selector | Example Value |
|--------|-------|----------|---------------|
| `getPublishDate()` | 0 | `time.font-medium` | `2024-12-15` |
| `getVideoCode()` | 1 | `span.font-medium` | `FC2-PPV-4560891` |
| `getTitleOriginalJapanese()` | 2 | `span.font-medium` | `タイトル...` |
| `getGenres()` | 3 | `a` (multiple) | `['uncensored', 'hd']` |
| `getSeries()` | 4 | `a` (first) | `FC2 Series` |
| `getManufacturer()` | 5 | `a` (first) | `FC2` |
| `getTag()` | 6 | `span.font-medium` | `FC2` |

Additional data is extracted from `<meta>` tags:

| Method | Meta Property | Example |
|--------|---------------|---------|
| `getThumbnail()` | `og:image` | `https://fourhoi.com/.../cover-n.jpg` |
| `getDuration()` | `video:duration` | `6420` (seconds) |

The title is extracted from the `<h1>` tag:
```typescript
async getTitle(): Promise<string> {
  await this.ensureLoaded();
  return this.$!('h1[class*="text-nord6"]').first().text().trim();
}
```

### M3U8 URL Reconstruction

This is the most interesting part — missav.ws embeds the HLS stream URL in an **obfuscated format** inside an inline `<script>` tag.

#### The Obfuscation

The raw JavaScript contains a string like:

```javascript
'm3u8<span>|</span>ps<span>|</span>sh<span>|</span>sut<span>|</span>...|video'
```

The actual data is separated by pipe characters (`|`) and the URL components are in **reversed order**. When we strip HTML tags, the content looks like:

```
m3u8|ps|sh|sut|...|video
```

#### The Reconstruction

```typescript
const M3U8_JS_REGEX = /'m3u8(.*?)video/;

// 1. Extract the pipe-separated content between 'm3u8' and 'video'
const match = html.match(M3U8_JS_REGEX);
const urlParts = javascriptContent.split('|').reverse();

// 2. After reversing, the parts are:
//    [1] = protocol (e.g., "https")
//    [2] = domain   (e.g., "surrit")
//    [3] = tld      (e.g., "com")
//    [4..8] = path segments joined with '-'

const protocol = urlParts[1];  // "https"
const domain  = urlParts[2];  // "surrit"
const tld     = urlParts[3];  // "com"
const path    = [urlParts[4], urlParts[5], urlParts[6], urlParts[7], urlParts[8]].join('-');

// Result: "https://surrit.com/xxxxx-yyyyy-zzzz-aaaa-bbbb/playlist.m3u8"
return `${protocol}://${domain}.${tld}/${path}/playlist.m3u8`;
```

The reconstructed URL is a **master playlist** that contains variant streams at different bitrates/qualities.

---

## Search: The Recombee API

### File: `src/signer.ts`, `src/constants.ts`

Search does **not** scrape missav.ws. Instead, it calls the **Recombee recommendation API** — a third-party personalization engine that missav.ws uses internally for search.

#### How Recombee Search Works

```
1. Client constructs a POST request to:
   https://client-rapi-missav.recombee.com/search/users/anonymous/items/

2. Body includes:
   {
     searchQuery: "FC2-PPV-123",
     count: 50,
     cascadeCreate: true,
     returnProperties: true
   }

3. Recombee returns:
   {
     recomms: [
       { id: "fc2-ppv-123456", values: { ... } },
       { id: "jul-987", values: { ... } },
       ...
     ]
   }

4. Each `id` is the video code. We construct URLs like:
   https://missav.ws/en/fc2-ppv-123456

5. Video details are fetched concurrently in batches of `maxWorkers`
   (default: 10), yielding Video objects via an async generator.
```

### HMAC Request Signing

Recombee requires authenticated requests. The authentication is done by **signing the request path** with HMAC-SHA1:

```typescript
export function signPath(path: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const separator = path.includes('?') ? '&' : '?';
  const unsigned = `/${DATABASE_ID}${path}${separator}frontend_timestamp=${ts}`;

  const signature = crypto
    .createHmac('sha1', PUBLIC_TOKEN)
    .update(unsigned, 'utf-8')
    .digest('hex');

  return `${unsigned}&frontend_sign=${signature}`;
}
```

For a request to `/search/users/anonymous/items/`, this produces:

```
/missav-default/search/users/anonymous/items/?frontend_timestamp=1234567890&frontend_sign=abc123def456...
```

The components:
- **DATABASE_ID**: `missav-default` (Recombee database name, extracted from missav frontend JS)
- **PUBLIC_TOKEN**: A long base64-ish token (also extracted from missav frontend JS — periodically rotated by the website)
- **Timestamp**: Current Unix time in seconds (prevents replay attacks)
- **Algorithm**: HMAC-SHA1 (symmetric — the token is both the signing key and the verification key)

The signed URL is then called via `axios`:

```typescript
const response = await this.http.post(url, body, {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
```

This request goes directly — no Cloudflare bypass needed because Recombee is a different domain.

---

## Listing Page Scraping

### File: `src/client.ts`

Listing pages (`/en/new`, `/en/genres/<slug>`, `/en/makers/<slug>`) are scraped through the `CloudflareFetcher` and parsed with cheerio.

### Video Code Detection

```typescript
const VIDEO_CODE_REGEX = /(fc2-ppv-\d+|[A-Z]{2,6}-\d{2,})(?:\?|$)/i;
```

This regex matches:
- **FC2 codes**: `fc2-ppv-123456` (case-insensitive)
- **JAV codes**: `JUL-123`, `STARS-456`, `ABF-789`, etc. (2-6 uppercase letters + digits)

A **second pass** filters out false positives by excluding strings that look like CSS utility classes (e.g., `mb-10`, `w-32`, `text-sm`, `bg-red`):

```typescript
if (/^(mb|mt|my|pt|pb|pr|pl|px|py|gap|text|bg|border|font|opacity|...)/.test(code))
  return null;
```

### Video Grid Parsing

`parseVideoGrid()` looks for anchor tags `<a href="/en/...">` on the page and extracts:

1. **Video code** from the href using the regex above
2. **Title** from the `title` attribute of the `<a>` tag, falling back to the `alt` attribute of the `<img>` inside it
3. **Thumbnail URL** from the `<img>` tag — checks `data-src` first (lazy-loaded images have the real URL here), then `src` (which may be a placeholder)

```typescript
const thumbnail = img.attr('data-src') || img.attr('src') || '';
```

A **fallback** parser runs if the primary parser found zero results — it looks for `<img>` tags with `src` containing `fourhoi.com` or `thumb` and walks up to the parent `<a>` tag to find the video code.

### Genre & Maker List Extraction

**Genres** (`getGenreList()`): Scans all `a[href*="/en/genres/"]` links, deduplicates by slug, and returns `{ name, slug, url }` objects.

**Makers** (`getMakerList()`): Same approach but for `a[href*="/en/makers/"]` links. Supports pagination via `?page=`.

### Pagination Detection

`getTotalPages()` scans all pagination links (`a[href*="page="]`) and finds the highest page number:

```typescript
private getTotalPages($: cheerio.CheerioAPI): number {
  let total = 1;
  $('a[href*="page="]').each((_, el) => {
    const m = $(el).attr('href')?.match(/page=(\d+)/);
    if (m) total = Math.max(total, parseInt(m[1] ?? '10', 10));
  });
  return total;
}
```

### Related Videos

`getRelatedVideos()` scrapes the video page for all anchor tags containing video code hrefs, deduplicates them, and returns `VideoSummary` objects. This captures the "related videos" sidebar content.

---

## Complete Class Reference

### Client

```typescript
class Client {
  constructor(config?: ClientConfig)
  
  // Video methods
  getVideo(url: string): Promise<Video>
  getVideoAttributes(url: string): Promise<VideoAttributes>
  
  // Search (async generator — batched concurrent fetches)
  search(query: string, options?: SearchOptions): AsyncGenerator<Video>
  
  // Listing / Browsing
  getGenreList(): Promise<GenreInfo[]>
  getMakerList(page?: number): Promise<MakerInfo[]>
  browseNew(page?: number): Promise<BrowseResult>
  browseGenre(genre: string, page?: number): Promise<BrowseResult>
  browseMaker(maker: string, page?: number): Promise<BrowseResult>
  getRelatedVideos(url: string): Promise<VideoSummary[]>
  
  // Lifecycle
  close(): Promise<void>
}
```

### Video

```typescript
class Video {
  readonly url: string;
  
  constructor(url: string, fetcher: CloudflareFetcher, cache?: Cache)
  
  // All async — each call triggers ensureLoaded() if not already loaded
  getTitle(): Promise<string>
  getPublishDate(): Promise<string>
  getVideoCode(): Promise<string>
  getTitleOriginalJapanese(): Promise<string>
  getGenres(): Promise<string[]>
  getSeries(): Promise<string>
  getManufacturer(): Promise<string>
  getMakerSlug(): Promise<string>
  getTag(): Promise<string>
  getM3u8BaseUrl(): Promise<string>
  getThumbnail(): Promise<string>
  getDuration(): Promise<number | undefined>
  
  // Convenience — calls all getters in parallel
  getAllAttributes(): Promise<VideoAttributes>
}
```

### Cache

```typescript
class Cache {
  constructor(defaultTtl?: number) // default: 300000ms (5 min)
  
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T, ttl?: number): void
  has(key: string): boolean
  delete(key: string): void
  clear(): void
  get size(): number
}
```

### CloudflareFetcher

```typescript
class CloudflareFetcher {
  constructor()
  fetch(url: string): Promise<string>
  close(): Promise<void> // no-op
}
```

---

## Data Flow Diagrams

### Single Video Fetch

```
client.getVideoAttributes(url)
         │
         ▼
   new Video(url, fetcher, cache)
         │
         ▼
   video.getAllAttributes()
         │
         ├──▶ Promise.all([
         │       getTitle(),
         │       getPublishDate(),
         │       getVideoCode(),
         │       getTitleOriginalJapanese(),
         │       getGenres(),
         │       getSeries(),
         │       getManufacturer(),
         │       getTag(),
         │       getMakerSlug(),
         │       getM3u8BaseUrl(),
         │       getThumbnail(),
         │       getDuration(),
         │     ])
         │
         ▼
   ┌─── ensureLoaded() ───┐
   │  (runs only once)    │
   │                       │
   │  cache hit?           │
   │   ├─ Yes → use cached │
   │   └─ No  → fetch via  │
   │            Fetcher    │
   └───────────┬───────────┘
               │
               ▼
   Python curl_cffi → missav.ws → HTML
               │
               ▼
   cheerio.load(html)
   Extract from DOM:
   ├─ h1 text-nord6           → title
   ├─ div.space-y-2 > div     → dates/codes/genres
   ├─ meta[og:image]          → thumbnail
   ├─ meta[video:duration]    → duration
   └─ script regex            → m3u8 URL
               │
               ▼
   Return VideoAttributes object
```

### Search Flow

```
client.search("FC2-PPV", { videoCount: 20, maxWorkers: 10 })
         │
         ▼
   signPath("/search/users/anonymous/items/")
   ├─ unsigned = "/missav-default/search/.../?frontend_timestamp=12345"
   └─ signed  = unsigned + "&frontend_sign=abc123..."
         │
         ▼
   axios.post("https://client-rapi-missav.recombee.com<signed-path>", {
     searchQuery: "FC2-PPV",
     count: 20,
     cascadeCreate: true,
     returnProperties: true,
   })
         │
         ▼
   Recombee returns: { recomms: [{ id: "fc2-ppv-123" }, ...] }
         │
         ▼
   Build video URLs from IDs
         │
         ▼
   Split into batches of 10 (maxWorkers)
         │
         ▼
   For each batch:
   ┌─ Promise.all(urls.map(url => this.getVideo(url)))
   │     └── Each Video is fetched individually
   └─ Yield each resolved Video object
         │
         ▼
   AsyncGenerator yields Video objects
```

---

## Error Handling

### Cloudflare Challenge Failure

If the Python helper can't bypass Cloudflare after 3 retries:

```
Failed to fetch page: Cloudflare challenge could not be resolved
Ensure Python 3 and curl_cffi are installed:
  python3 -m venv /path/to/venv && source /path/to/venv/bin/activate && pip install curl-cffi
```

### M3U8 Extraction Failure

If the regex doesn't match or the URL reconstruction fails:

```
Could not find m3u8 data in page
// or
Could not reconstruct m3u8 URL from page data
```

### Thumbnail Extraction Failure

If `og:image` meta tag is missing:

```
Could not find og:image meta tag
```

### Timeout

The `CloudflareFetcher` has a 30-second timeout per request. The `Client` has a configurable timeout (default 30s) that applies to the Recombee search API (via axios).

### Search Batch Failures

When searching, individual video failures are caught and logged — one bad video won't crash the entire search:

```typescript
for (const batch of batches) {
  const promises = batch.map(async (url) => {
    try {
      return await this.getVideo(url);
    } catch (err) {
      this.log(`Failed to fetch video ${url}:`, err);
      return null;  // Skip failed video, continue with others
    }
  });
  const resolved = await Promise.all(promises);
  for (const video of resolved) {
    if (video) yield video;
  }
}
```

---

## Constants Reference

### File: `src/constants.ts`

| Constant | Value | Purpose |
|----------|-------|---------|
| `BASE_HOST` | `client-rapi-missav.recombee.com` | Recombee API hostname |
| `DATABASE_ID` | `missav-default` | Recombee database identifier |
| `PUBLIC_TOKEN` | (long base64 string) | HMAC signing key for Recombee auth |
| `DEFAULT_SEARCH_COUNT` | `50` | Default max search results |
| `DEFAULT_MAX_WORKERS` | `10` | Concurrent video detail fetchers |
| `DEFAULT_CACHE_TTL` | `300000` (5 min) | Default cache expiry |
| `DEFAULT_TIMEOUT` | `30` (seconds) | HTTP request timeout |

---

## TypeScript Types

### File: `src/types.ts`

```typescript
interface VideoAttributes {
  title: string;
  publishDate: string;
  videoCode: string;
  titleOriginalJapanese: string;
  genres: string[];
  series: string;
  manufacturer: string;
  tag: string;                    // e.g. "FC2", "Caribbeancom"
  makerSlug: string;              // e.g. "Fc2" for linking to maker page
  m3u8BaseUrl: string;            // HLS master playlist URL
  thumbnail: string;              // Fourhoi thumbnail URL
  duration?: number;              // Duration in seconds
}

type VideoQuality = 'best' | 'half' | 'worst' | number;

interface SearchOptions {
  videoCount?: number;            // Default: 50
  maxWorkers?: number;            // Default: 10
}

interface GenreInfo {
  name: string;
  slug: string;
  url: string;
}

interface MakerInfo {
  name: string;
  slug: string;
  url: string;
}

interface VideoSummary {          // Lightweight — from listing pages
  videoCode: string;
  title: string;
  thumbnail: string;
  url: string;
}

interface BrowseResult {
  videos: VideoSummary[];
  page: number;
  totalPages: number;
  title: string;
}

interface ClientConfig {
  timeout?: number;
  userAgent?: string;
  proxy?: string;
  cache?: boolean;
  cacheTtl?: number;
  debug?: boolean;
}
```
