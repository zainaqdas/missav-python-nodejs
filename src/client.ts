import axios, { AxiosInstance } from 'axios';
import { Cache } from './cache';
import { Video } from './video';
import { CloudflareFetcher } from './fetcher';
import * as cheerio from 'cheerio';
import type {
  SearchOptions,
  ClientConfig,
  VideoAttributes,
  GenreInfo,
  MakerInfo,
  VideoSummary,
  BrowseResult,
} from './types';
import { signPath } from './signer';
import {
  BASE_HOST,
  DEFAULT_HEADERS,
  DEFAULT_SEARCH_COUNT,
  DEFAULT_MAX_WORKERS,
  DEFAULT_CACHE_TTL,
  DEFAULT_TIMEOUT,
} from './constants';

/**
 * Parse a proxy URL string into host and port for axios.
 */
function parseProxyUrl(proxyUrl: string): { host: string; port: number; auth?: { username: string; password: string } } | null {
  try {
    const url = new URL(proxyUrl);
    const result: { host: string; port: number; auth?: { username: string; password: string } } = {
      host: url.hostname,
      port: parseInt(url.port, 10) || 8080,
    };
    if (url.username) {
      result.auth = {
        username: url.username,
        password: url.password,
      };
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Regex for matching JAV/FC2 video codes in URLs.
 * Uppercase-only for JAV codes to avoid matching CSS utility classes (gray-300, mb-10, etc.)
 */
const VIDEO_CODE_REGEX = /(fc2-ppv-\d+|[A-Z]{2,6}-\d{2,})(?:\?|$)/i;

/**
 * Main client for the missAV API.
 * Provides methods to fetch video metadata and search for videos.
 */
export class Client {
  private http: AxiosInstance;
  private cache: Cache;
  private fetcher: CloudflareFetcher;
  private config: Required<ClientConfig>;

  constructor(config: ClientConfig = {}) {
    this.config = {
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      userAgent: config.userAgent ?? DEFAULT_HEADERS['User-Agent'] ?? 'Mozilla/5.0',
      proxy: config.proxy ?? '',
      cache: config.cache ?? true,
      cacheTtl: config.cacheTtl ?? DEFAULT_CACHE_TTL,
      debug: config.debug ?? false,
    };

    this.cache = this.config.cache ? new Cache(this.config.cacheTtl) : new Cache(0);

    const axiosConfig: Record<string, unknown> = {
      timeout: this.config.timeout * 1000,
      headers: {
        'User-Agent': this.config.userAgent,
        ...DEFAULT_HEADERS,
      },
    };

    // Handle proxy configuration
    if (this.config.proxy) {
      const parsed = parseProxyUrl(this.config.proxy);
      if (parsed) {
        axiosConfig.proxy = parsed;
      }
    }

    this.http = axios.create(axiosConfig);
    this.fetcher = new CloudflareFetcher();
  }

  /**
   * Fetch a video by its missAV URL.
   *
   * @param url - The full video URL (e.g. https://missav.ws/en/fc2-ppv-123456)
   */
  async getVideo(url: string): Promise<Video> {
    return new Video(url, this.fetcher, this.cache);
  }

  /**
   * Search for videos on missAV using the Recombee API.
   * Returns an async generator of Video objects.
   *
   * @param query - The search term
   * @param options - Search options (videoCount, maxWorkers)
   */
  async *search(
    query: string,
    options: SearchOptions = {}
  ): AsyncGenerator<Video, void, undefined> {
    const videoCount = options.videoCount ?? DEFAULT_SEARCH_COUNT;
    const maxWorkers = options.maxWorkers ?? DEFAULT_MAX_WORKERS;

    const path = '/search/users/anonymous/items/';
    const signedPath = signPath(path);
    const url = `https://${BASE_HOST}${signedPath}`;

    const body: Record<string, unknown> = {
      searchQuery: query,
      count: videoCount,
      cascadeCreate: true,
      returnProperties: true,
    };

    this.log('Searching for:', query);

    const response = await this.http.post(url, body, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = response.data as { recomms?: Array<{ id: string; values?: Record<string, unknown> }> };
    const recomms = data.recomms ?? [];

    this.log(`Found ${recomms.length} results`);

    // Build video URLs from recommendation IDs
    const videoUrls: string[] = recomms.map(
      (video: { id: string }) => `https://missav.ws/en/${video.id}`
    );

    // Fetch video details concurrently with limited concurrency
    const batches: string[][] = [];
    for (let i = 0; i < videoUrls.length; i += maxWorkers) {
      batches.push(videoUrls.slice(i, i + maxWorkers));
    }

    for (const batch of batches) {
      const promises = batch.map(async (url) => {
        try {
          return await this.getVideo(url);
        } catch (err) {
          this.log(`Failed to fetch video ${url}:`, err);
          return null;
        }
      });

      const resolved = await Promise.all(promises);
      for (const video of resolved) {
        if (video) {
          yield video;
        }
      }
    }
  }

  /** Convenience: get video attributes directly without interacting with the Video object. */
  async getVideoAttributes(url: string): Promise<VideoAttributes> {
    const video = await this.getVideo(url);
    return video.getAllAttributes();
  }

  // ── Listing / Browsing methods ────────────────────────────────

  /** Fetch and cache an HTML page via the fetcher. */
  private async fetchPage(url: string): Promise<string> {
    const cacheKey = `page:${url}`;
    const cached = this.cache.get<string>(cacheKey);
    if (cached) return cached;

    const html = await this.fetcher.fetch(url);
    this.cache.set(cacheKey, html);
    return html;
  }

  /**
   * Get the list of all genres from /en/genres.
   */
  async getGenreList(): Promise<GenreInfo[]> {
    const html = await this.fetchPage('https://missav.ws/en/genres');
    const $ = cheerio.load(html);
    const genres: GenreInfo[] = [];
    const seen = new Set<string>();

    $('a[href*="/en/genres/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      // Handle both absolute (https://missav.ws/en/genres/hd) and relative (/en/genres/hd) URLs
      const pathPart = href.includes('/en/genres/') ? (href.split('/en/genres/')[1] ?? '') : '';
      const slug = (pathPart.split('?')[0] ?? '').split('#')[0];
      if (!slug || slug.includes('/') || slug === '' || seen.has(slug)) return;
      seen.add(slug);

      const name = $(el).text().trim();
      if (name) {
        genres.push({ name, slug, url: `https://missav.ws/en/genres/${slug}` });
      }
    });

    return genres;
  }

  /**
   * Get the list of all makers/studios from /en/makers.
   */
  async getMakerList(page: number = 1): Promise<MakerInfo[]> {
    const url = page > 1
      ? `https://missav.ws/en/makers?page=${page}`
      : 'https://missav.ws/en/makers';
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);
    const makers: MakerInfo[] = [];
    const seen = new Set<string>();

    $('a[href*="/en/makers/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      // Handle both absolute (https://missav.ws/en/makers/foo) and relative (/en/makers/foo) URLs
      const pathPart = href.includes('/en/makers/') ? (href.split('/en/makers/')[1] ?? '') : '';
      const slug = (pathPart.split('?')[0] ?? '').split('#')[0];
      if (!slug || slug.includes('/') || slug === '' || seen.has(slug)) return;
      seen.add(slug);

      const name = $(el).text().trim();
      if (name) {
        makers.push({ name, slug, url: `https://missav.ws/en/makers/${slug}` });
      }
    });

    return makers;
  }

  /**
   * Extract a video code from an href string. Returns null if no valid code found.
   * Only matches FC2 codes or uppercase JAV codes (avoids CSS class false-positives).
   */
  private extractVideoCode(href: string): string | null {
    const match = href.match(VIDEO_CODE_REGEX);
    if (!match || !match[1]) return null;
    const code = match[1].toLowerCase();
    // Filter out obvious non-video codes (CSS classes, date strings, etc.)
    if (/^(mb|mt|my|pt|pb|pr|pl|px|py|gap|text|bg|border|font|opacity|duration|delay|ease|line|tracking|leading|w-|h-|max-w|min-h|inset|top|right|bottom|left|translate|rotate|scale|skew|origin|blur|drop-shadow|backdrop)/.test(code)) return null;
    return code;
  }

  /**
   * Extract video summaries from a listing page HTML.
   */
  private parseVideoGrid($: cheerio.CheerioAPI): VideoSummary[] {
    const videos: VideoSummary[] = [];
    const seen = new Set<string>();

    // Primary: look for anchor tags with JAV/FC2 video codes in their href
    $('a[href*="/en/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const videoCode = this.extractVideoCode(href);
      if (!videoCode || seen.has(videoCode)) return;
      seen.add(videoCode);

      const img = $(el).find('img').first();
      const title = $(el).attr('title') || img.attr('alt') || '';
      // data-src has the real URL (lazy-loaded); src is a placeholder
      const thumbnail = img.attr('data-src') || img.attr('src') || '';

      const fullUrl = href.startsWith('http') ? href : `https://missav.ws${href}`;
      videos.push({ videoCode, title, thumbnail, url: fullUrl });
    });

    // Fallback: look for img thumbnails with video code anchor parents
    if (videos.length === 0) {
      $('img[src*="fourhoi.com"], img[src*="missav"], img[src*="thumb"]').each((_, el) => {
        const src = $(el).attr('src') || '';
        const parentLink = $(el).closest('a');
        const href = parentLink.attr('href');
        if (!href) return;

        const videoCode = this.extractVideoCode(href);
        if (!videoCode || seen.has(videoCode)) return;
        seen.add(videoCode);

        videos.push({
          videoCode,
          title: $(el).attr('alt') || videoCode,
          thumbnail: src,
          url: href.startsWith('http') ? href : `https://missav.ws${href}`,
        });
      });
    }

    return videos;
  }

  /** Estimate total pages from pagination link hrefs. */
  private getTotalPages($: cheerio.CheerioAPI): number {
    let total = 1;
    $('a[href*="page="]').each((_, el) => {
      const m = $(el).attr('href')?.match(/page=(\d+)/);
      if (m) {
        total = Math.max(total, parseInt(m[1] ?? '10', 10));
      }
    });
    return total;
  }

  /**
   * Browse videos by genre.
   */
  async browseGenre(genre: string, page: number = 1): Promise<BrowseResult> {
    const url = page > 1
      ? `https://missav.ws/en/genres/${genre}?page=${page}`
      : `https://missav.ws/en/genres/${genre}`;
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || genre;
    const videos = this.parseVideoGrid($);
    const totalPages = this.getTotalPages($);

    return { videos, page, totalPages, title };
  }

  /**
   * Browse videos by maker/studio.
   */
  async browseMaker(maker: string, page: number = 1): Promise<BrowseResult> {
    const url = page > 1
      ? `https://missav.ws/en/makers/${maker}?page=${page}`
      : `https://missav.ws/en/makers/${maker}`;
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || maker;
    const videos = this.parseVideoGrid($);
    const totalPages = this.getTotalPages($);

    return { videos, page, totalPages, title };
  }

  /**
   * Browse newly released videos.
   */
  async browseNew(page: number = 1): Promise<BrowseResult> {
    const url = page > 1
      ? `https://missav.ws/en/new?page=${page}`
      : 'https://missav.ws/en/new';
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    const title = 'Recent Updates';
    const videos = this.parseVideoGrid($);
    const totalPages = this.getTotalPages($);

    return { videos, page, totalPages, title };
  }

  /**
   * Get related video summaries from a video page.
   */
  async getRelatedVideos(url: string): Promise<VideoSummary[]> {
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);
    const videos: VideoSummary[] = [];
    const seen = new Set<string>();

    // Look for video links on the page (related section)
    $('a[href*="/en/"], a[href*="/dm"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const videoCode = this.extractVideoCode(href);
      if (!videoCode || seen.has(videoCode)) return;
      seen.add(videoCode);

      const img = $(el).find('img').first();
      // data-src has the real URL (lazy-loaded); src is a placeholder
      const thumbnail = img.attr('data-src') || img.attr('src') || '';

      videos.push({
          videoCode,
          title: $(el).attr('title') || img.attr('alt') || videoCode,
          thumbnail,
          url: href.startsWith('http') ? href : `https://missav.ws${href}`,
        });
    });

    return videos;
  }

  /** Clean up the fetcher's browser instance. */
  async close(): Promise<void> {
    await this.fetcher.close();
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[missAV]', ...args);
    }
  }
}
