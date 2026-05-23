# missAV Explorer

> An unofficial Node.js/TypeScript API and Next.js frontend for browsing and streaming videos from missav.ws.

This project consists of two parts:

| Package | Location | Description |
|---------|----------|-------------|
| **`missav-api`** | `./` (root) | Node.js/TypeScript backend — scrapes video metadata, search results, and listing pages from missav.ws |
| **`missav-frontend`** | `./frontend/` | Next.js 15 web app with a modern glassmorphism UI — search, browse, and stream videos |

---

## Table of Contents

- [Architecture](#architecture)
- [missav-api (Backend)](#missav-api-backend)
  - [Installation](#installation-backend)
  - [Quick Start](#quick-start-backend)
  - [Client API](#client-api)
  - [Video Attributes](#video-attributes)
  - [Browsing Methods](#browsing-methods)
  - [Search](#search)
  - [Configuration](#configuration)
- [missav-frontend (Frontend)](#missav-frontend)
  - [Setup](#setup-frontend)
  - [API Routes](#api-routes)
  - [Pages](#pages)
  - [Components](#components)
- [Deployment](#deployment)
- [License](#license)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  missav-frontend                      │
│                    (Next.js 15)                       │
│                                                       │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────┐ │
│  │   Pages     │  │   API Routes    │  │Components│ │
│  │  (SSR/CSR)  │  │  (/api/*)       │  │ (Client) │ │
│  └──────┬──────┘  └────────┬────────┘  └────┬─────┘ │
│         │                  │                  │        │
│         ├──────────────────┼──────────────────┘        │
│         │                  │                           │
└─────────┼──────────────────┼───────────────────────────┘
          │                  │
          ▼                  ▼
┌────────────────────────────────────────────────────────┐
│               missav-api  (missav.ws)                    │
│                                                          │
│  ┌──────────┐  ┌─────────┐  ┌────────────────────┐     │
│  │  Client  │  │  Video  │  │ CloudflareFetcher   │     │
│  │          │  │  (attr) │  │ (Python curl_cffi)  │     │
│  └────┬─────┘  └────┬────┘  └─────────┬──────────┘     │
│       │              │                 │                 │
│       └──────────────┼─────────────────┘                 │
│                      ▼                                   │
│              missav.ws (source website)                   │
└──────────────────────────────────────────────────────────┘
```

### How it Works

1. **Frontend API routes** (`/api/*`) call the `missav-api` Node.js package
2. **`missav-api`** scrapes missav.ws using Python `curl_cffi` (TLS impersonation to bypass Cloudflare)
3. **HLS and thumbnail proxies** (`/api/hls`, `/api/thumb`) forward CDN requests with proper `Referer` headers to bypass referrer-based access control
4. **Search** uses Recombee's recommendation API (signed HMAC requests) — not web scraping

---

## missav-api (Backend)

### Installation (Backend)

```bash
npm install missav-api
# or, from this repo:
npm run build
```

**Prerequisite:** Python 3.9+ with `curl_cffi` for Cloudflare bypass:

```bash
python3 -m venv venv
source venv/bin/activate
pip install curl-cffi
```

The `CloudflareFetcher` auto-detects the virtual environment and falls back to the system `python3` if no venv is found.

### Quick Start (Backend)

```typescript
import { Client } from 'missav-api';

const client = new Client({ timeout: 60 });

// Fetch full video metadata
const video = await client.getVideo('https://missav.ws/en/fc2-ppv-123456');
const attrs = await video.getAllAttributes();
console.log(attrs.title);       // "FC2-PPV-123456 Some Title"
console.log(attrs.m3u8BaseUrl); // "https://surrit.com/.../playlist.m3u8"
console.log(attrs.thumbnail);   // "https://fourhoi.com/.../cover-n.jpg"
console.log(attrs.duration);    // 6420 (seconds)

// Search for videos
const generator = client.search('FC2-PPV', { videoCount: 10, maxWorkers: 5 });
for await (const video of generator) {
  const attrs = await video.getAllAttributes();
  console.log(attrs.title);
}

// Browse latest releases
const latest = await client.browseNew(1);
console.log(`Page ${latest.page} of ${latest.totalPages}`);
for (const summary of latest.videos) {
  console.log(summary.title, summary.thumbnail);
}

// Clean up
await client.close();
```

### Client API

#### `new Client(config?)`

Creates a new client instance. See [Configuration](#configuration) for options.

#### `client.getVideo(url): Promise<Video>`

Fetch a video page by URL. Returns a `Video` object with lazy-loaded async methods:

```typescript
const video = await client.getVideo('https://missav.ws/en/fc2-ppv-123456');

const title = await video.getTitle();
const date = await video.getPublishDate();
const code = await video.getVideoCode();
const jpTitle = await video.getTitleOriginalJapanese();
const genres = await video.getGenres();
const series = await video.getSeries();
const manufacturer = await video.getManufacturer();
const tag = await video.getTag();
const makerSlug = await video.getMakerSlug();
const m3u8Url = await video.getM3u8BaseUrl();
const thumbnail = await video.getThumbnail();
const duration = await video.getDuration();
```

#### `client.getVideoAttributes(url): Promise<VideoAttributes>`

Convenience method that calls `getVideo(url)` then `video.getAllAttributes()` in one step.

#### `client.search(query, options?): AsyncGenerator<Video>`

Search using Recombee API. Returns an async generator of `Video` objects fetched concurrently in batches.

```typescript
const results = client.search('JUL-123', { videoCount: 30, maxWorkers: 10 });
for await (const video of results) {
  // process video
}
```

#### `client.getGenreList(): Promise<GenreInfo[]>`

Scrapes `missav.ws/en/genres` for all genre slugs and names.

```typescript
const genres = await client.getGenreList();
// [{ name: "High Definition", slug: "hd", url: "..." }, ...]
```

#### `client.getMakerList(page?): Promise<MakerInfo[]>`

Scrapes `missav.ws/en/makers` for studio/maker listings. Supports pagination.

#### `client.browseNew(page?): Promise<BrowseResult>`

Fetch the latest releases page.

#### `client.browseGenre(genre, page?): Promise<BrowseResult>`

Browse videos by genre slug (e.g. `"hd"`, `"uncensored"`, `"english-subtitle"`).

#### `client.browseMaker(maker, page?): Promise<BrowseResult>`

Browse videos by maker slug (e.g. `"Fc2"`, `"1pondo"`, `"heyzo"`).

#### `client.getRelatedVideos(url): Promise<VideoSummary[]>`

Get related video summaries from a video page.

#### `client.close(): Promise<void>`

Clean up the fetcher's resources.

### Video Attributes

The `VideoAttributes` interface returned by `getAllAttributes()`:

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | English title from the `<h1>` tag |
| `publishDate` | `string` | Release date (e.g. "2024-01-15") |
| `videoCode` | `string` | Video code (e.g. "FC2-PPV-123456") |
| `titleOriginalJapanese` | `string` | Original Japanese title |
| `genres` | `string[]` | List of genre tags |
| `series` | `string` | Series name (if available) |
| `manufacturer` | `string` | Manufacturer/studio name |
| `tag` | `string` | Tag field (e.g. "FC2", "Caribbeancom") |
| `makerSlug` | `string` | Maker URL slug for linking to maker browse page |
| `m3u8BaseUrl` | `string` | HLS master playlist URL (e.g. `https://surrit.com/.../playlist.m3u8`) |
| `thumbnail` | `string` | Thumbnail URL from `og:image` meta tag |
| `duration?` | `number` | Duration in seconds (extracted from `video:duration` meta tag) |

### Browsing Methods

`browseNew`, `browseGenre`, and `browseMaker` all return `BrowseResult`:

```typescript
interface BrowseResult {
  videos: VideoSummary[];   // Lightweight video info (no m3u8/attributes)
  page: number;             // Current page number
  totalPages: number;       // Estimated total pages
  title: string;            // Page title
}

interface VideoSummary {
  videoCode: string;
  title: string;
  thumbnail: string;        // URL to thumbnail (may need proxy)
  url: string;              // Full missav.ws URL
}
```

### Configuration

```typescript
interface ClientConfig {
  timeout?: number;       // Request timeout in seconds (default: 30)
  userAgent?: string;     // Custom User-Agent string
  proxy?: string;         // Proxy URL (e.g. "http://user:pass@host:8080")
  cache?: boolean;        // Enable in-memory caching (default: true)
  cacheTtl?: number;      // Cache TTL in ms (default: 300000 = 5 min)
  debug?: boolean;        // Enable debug logging (default: false)
}
```

---

## missav-frontend (Frontend)

A Next.js 15 app with a dark glassmorphism UI. Built with Tailwind CSS, HLS.js, and Plyr.

### Setup (Frontend)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

The frontend depends on `missav-api` (linked via `file:..` in package.json). Build the backend first:

```bash
npm run build      # builds dist/ in root
```

### API Routes

All API routes live in `frontend/src/app/api/` and are consumed by the React components via the `@/lib/api` client library.

| Route | Method | Params | Description |
|-------|--------|--------|-------------|
| `/api/search` | POST | `{ query, count? }` | Search videos using Recombee API |
| `/api/video` | GET | `?url=` | Get full video attributes for a missav.ws URL |
| `/api/video/related` | GET | `?url=` | Get related videos for a video page |
| `/api/browse` | GET | `?type=new\|genre\|maker&slug=&page=` | Browse videos by type |
| `/api/genres` | GET | — | List all available genres |
| `/api/makers` | GET | `?page=` | List makers/studios |
| `/api/hls` | GET | `?url=` | **Proxy** for HLS streams from surrit.com (adds `Referer: missav.ws`) |
| `/api/thumb` | GET | `?url=` | **Proxy** for thumbnail images from fourhoi.com (adds `Referer: missav.ws`) |

#### HLS Proxy (`/api/hls`)

The HLS proxy is critical for video playback. Surrit.com (the CDN serving m3u8 playlists and .ts segments) checks the `Referer` header. The proxy:
- Forwards requests with `Referer: https://missav.ws/`
- Rewrites m3u8 playlists so all segment/variant URIs also go through the proxy
- Only allows `https://surrit.com/` URLs (SSRF protection)
- Caches segments for 1 hour, manifests for 30 seconds

#### Thumbnail Proxy (`/api/thumb`)

Similarly, fourhoi.com (thumbnail CDN) returns 403 for non-missav origins. The proxy:
- Forwards requests with `Referer: https://missav.ws/`
- Only allows `https://fourhoi.com/` URLs (SSRF protection)
- Caches for 1 hour (browser) / 1 day (CDN)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Homepage with hero, search bar, popular tags, recent videos, and quick nav cards |
| `/video/[id]` | `video/[id]/page.tsx` | Video detail page with Plyr player, metadata grid, related videos sidebar |
| `/browse/new` | `browse/new/page.tsx` | Paginated grid of latest releases |
| `/browse/genres` | `browse/genres/page.tsx` | Browse all genres |
| `/browse/genres/[genre]` | `browse/genres/[genre]/page.tsx` | Paginated grid of videos for a specific genre |
| `/browse/makers` | `browse/makers/page.tsx` | Browse makers with inline filter/search |
| `/browse/makers/[maker]` | `browse/makers/[maker]/page.tsx` | Paginated grid of videos for a specific maker |

#### Homepage Features

- **Hero section** with gradient background and animated glow effects
- **Search bar** with focus animation, glow effect, and clear button
- **Popular tags** — clickable chips for common search terms
- **Quick nav cards** — links to Genres, Makers, Latest Releases
- **Recent videos** section with loading skeleton
- **URL param search** — `/?q=FC2-PPV` auto-executes a search on page load

#### Video Page Features

- **Plyr video player** with full controls:
  - Play/pause, skip ±10s, progress bar with tooltips
  - Volume slider, mute toggle
  - Playback speed (0.5x–2x)
  - Fullscreen (browser + native iOS)
- **Safety timeout** — loading overlay auto-dismisses after 20s
- **Metadata grid** — video code, release date, duration, series, manufacturer (clickable), tag
- **Action buttons** — direct stream URL download
- **Genre tags** — clickable to browse by genre
- **Related videos sidebar** — thumbnail + title links

### Components

| Component | File | Description |
|-----------|------|-------------|
| `NavBar` | `components/NavBar.tsx` | Sticky top nav with search bar, nav links, mobile hamburger menu |
| `SearchBar` | `components/SearchBar.tsx` | Animated search input used on homepage |
| `VideoGrid` | `components/VideoGrid.tsx` | Grid layout with loading skeletons and empty state |
| `VideoCard` | `components/VideoCard.tsx` | Card for `VideoAttributes` (search results) with thumbnail, title, date, genres |
| `VideoSummaryCard` | `components/VideoSummaryCard.tsx` | Compact card for `VideoSummary` (browse listings) with thumbnail and code badge |
| `VideoPlayer` | `components/VideoPlayer.tsx` | Plyr + HLS.js integration, dynamically imported with `ssr: false` |
| `Footer` | `components/Footer.tsx` | Simple footer with attribution |

### Styling

- **Tailwind CSS** with custom `surface` and `primary` (rose/pink) color palettes
- **Glassmorphism** — `glass-card` utility for semi-transparent, blurred backgrounds
- **Animations** — `fade-in`, `slide-up`, `shimmer` (loading skeletons), pulse
- **Custom scrollbar** styling
- **Inter font** from Google Fonts

---

## Deployment

### Building

```bash
# Backend
npm run build              # compiles src/ → dist/

# Frontend
cd frontend
npx next build             # builds the Next.js app
npx next start -p 3000     # starts production server
```

### Environment

The frontend runs entirely on client-side rendering (CSR) for API-fetching pages, with a few server-rendered shells. No database or API keys are needed — everything is scraped from missav.ws.

### Required Dependencies

**System:**
- Node.js 18+
- Python 3.9+
- `pip install curl-cffi`

**Node (backend):**
- `axios` — HTTP client for Recombee search API
- `cheerio` — HTML parsing and DOM traversal
- `playwright` — used internally by fetcher (fallback)
- `typescript` — compilation

**Node (frontend):**
- `next` — React framework
- `hls.js` — HLS playback in the browser
- `plyr` — Custom video player controls
- `react` / `react-dom` — UI framework
- `tailwindcss` — Utility-first CSS

---

## FAQ

**Q: Why does the frontend need proxy routes for HLS and thumbnails?**
A: The CDNs serving video segments (surrit.com) and thumbnails (fourhoi.com) check the `Referer` header and block requests that don't originate from missav.ws. The proxy routes add the correct `Referer` header server-side.

**Q: Why use Python curl_cffi instead of just axios?**
A: missav.ws is behind Cloudflare. Axios makes plain HTTP requests that get instantly blocked. Python's `curl_cffi` impersonates Chrome's TLS fingerprint at the libcurl level — Cloudflare sees an authentic browser fingerprint and lets the request through on the first try (~1-2s). No full browser needed.

**Q: Search doesn't return results?**
A: Search uses Recombee's recommendation API with HMAC-signed requests. The signing key and database ID are embedded in the missav frontend JavaScript and are periodically rotated. If search breaks, the constants in `src/constants.ts` may need updating.

**Q: Videos don't play?**
A: The HLS proxy requires the `missav-api` backend to be built (`npm run build`) so it can extract the m3u8 URL from the video page. Check the browser devtools network tab for `/api/hls` requests returning errors.

---

## License

ISC
