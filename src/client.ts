import axios, { AxiosInstance } from 'axios';
import { Cache } from './cache';
import { Video } from './video';
import { CloudflareFetcher } from './fetcher';
import type { SearchOptions, ClientConfig, VideoAttributes } from './types';
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
    this.fetcher = new CloudflareFetcher(this.http);
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
