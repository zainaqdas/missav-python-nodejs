import * as cheerio from 'cheerio';
import type { VideoAttributes } from './types';
import { Cache } from './cache';
import { CloudflareFetcher } from './fetcher';

/**
 * Regex to extract m3u8 data from inline JavaScript on the video page.
 * The JS contains: 'm3u8<pipe-separated-data>video'
 */
const M3U8_JS_REGEX = /'m3u8(.*?)video/;

/**
 * Represents a missAV video with full metadata.
 * Fetches and parses the video page HTML to extract all attributes.
 */
export class Video {
  readonly url: string;
  private fetcher: CloudflareFetcher;
  private cache: Cache;
  private html: string | null = null;
  private $: cheerio.CheerioAPI | null = null;
  /** Guard promise to prevent duplicate concurrent fetches */
  private loadingPromise: Promise<void> | null = null;

  constructor(url: string, fetcher: CloudflareFetcher, cache?: Cache) {
    this.url = url;
    this.fetcher = fetcher;
    this.cache = cache ?? new Cache();
  }

  /**
   * Fetch the video page HTML if not already loaded.
   * Uses a promise guard to prevent duplicate concurrent fetches.
   */
  private async ensureLoaded(): Promise<void> {
    if (this.html) return;

    // If a fetch is already in progress, wait for it
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    const cached = this.cache.get<string>(`html:${this.url}`);
    if (cached) {
      this.html = cached;
      this.$ = cheerio.load(cached);
      return;
    }

    this.loadingPromise = (async () => {
      const html = await this.fetcher.fetch(this.url);
      this.html = html;
      this.$ = cheerio.load(html);
      this.cache.set(`html:${this.url}`, html);
    })();

    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Get all metadata divs from the space-y-2 container.
   * These contain publish date, video code, genres, series, etc.
   */
  private getMetaDivs(): cheerio.Cheerio<any> {
    if (!this.$) throw new Error('Page not loaded');
    const container = this.$('div.space-y-2').first();
    return container.find('> div.text-secondary');
  }

  /** The video title (language depends on URL — /en/ or /ja/). */
  async getTitle(): Promise<string> {
    await this.ensureLoaded();
    return this.$!('h1[class*="text-nord6"]').first().text().trim();
  }

  /** The publish date of the video. */
  async getPublishDate(): Promise<string> {
    await this.ensureLoaded();
    const metaDivs = this.getMetaDivs();
    return metaDivs.eq(0).find('time.font-medium').first().text().trim();
  }

  /** The video code (e.g., FC2-PPV-123456). */
  async getVideoCode(): Promise<string> {
    await this.ensureLoaded();
    const metaDivs = this.getMetaDivs();
    return metaDivs.eq(1).find('span.font-medium').first().text().trim();
  }

  /** The original Japanese title. */
  async getTitleOriginalJapanese(): Promise<string> {
    await this.ensureLoaded();
    const metaDivs = this.getMetaDivs();
    const el = metaDivs.eq(2).find('span.font-medium').first();
    return el.text().trim();
  }

  /** List of genre tags for the video. */
  async getGenres(): Promise<string[]> {
    await this.ensureLoaded();
    const metaDivs = this.getMetaDivs();
    const genres: string[] = [];
    metaDivs.eq(3).find('a').each((_: number, el: any) => {
      genres.push(this.$!(el).text().trim());
    });
    return genres;
  }

  /** The series name. */
  async getSeries(): Promise<string> {
    await this.ensureLoaded();
    const metaDivs = this.getMetaDivs();
    const el = metaDivs.eq(4).find('a').first();
    return el.text().trim();
  }

  /** The manufacturer. */
  async getManufacturer(): Promise<string> {
    await this.ensureLoaded();
    const metaDivs = this.getMetaDivs();
    const el = metaDivs.eq(5).find('a').first();
    return el.text().trim();
  }

  /** The etiquette / label. */
  async getEtiquette(): Promise<string> {
    await this.ensureLoaded();
    const metaDivs = this.getMetaDivs();
    const el = metaDivs.eq(6).find('a').first();
    return el.text().trim();
  }

  /**
   * The HLS master playlist URL (m3u8).
   *
   * The missav page embeds the stream URL in an inline script in a
   * reversed pipe-delimited format. This reconstructs it.
   */
  async getM3u8BaseUrl(): Promise<string> {
    await this.ensureLoaded();
    const match = this.html!.match(M3U8_JS_REGEX);
    if (!match || !match[1]) {
      throw new Error('Could not find m3u8 data in page');
    }
    const javascriptContent = match[1];
    const urlParts = javascriptContent.split('|').reverse();

    const protocol = urlParts[1];
    const domain = urlParts[2];
    const tld = urlParts[3];
    const path = [
      urlParts[4],
      urlParts[5],
      urlParts[6],
      urlParts[7],
      urlParts[8],
    ].join('-');

    if (!protocol || !domain || !tld || !path) {
      throw new Error('Could not reconstruct m3u8 URL from page data');
    }

    return `${protocol}://${domain}.${tld}/${path}/playlist.m3u8`;
  }

  /** The video thumbnail URL. */
  async getThumbnail(): Promise<string> {
    await this.ensureLoaded();
    const ogImage = this.$!('meta[property="og:image"]').attr('content');
    if (!ogImage) {
      throw new Error('Could not find og:image meta tag');
    }
    return ogImage;
  }

  /** The video duration in seconds. */
  async getDuration(): Promise<number | undefined> {
    await this.ensureLoaded();
    const durationMeta = this.$!('meta[property="video:duration"]').attr('content');
    if (!durationMeta) return undefined;
    const parsed = parseInt(durationMeta, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /** Get all video attributes in one call. */
  async getAllAttributes(): Promise<VideoAttributes> {
    const [
      title,
      publishDate,
      videoCode,
      titleOriginalJapanese,
      genres,
      series,
      manufacturer,
      etiquette,
      m3u8BaseUrl,
      thumbnail,
      duration,
    ] = await Promise.all([
      this.getTitle(),
      this.getPublishDate(),
      this.getVideoCode(),
      this.getTitleOriginalJapanese(),
      this.getGenres(),
      this.getSeries(),
      this.getManufacturer(),
      this.getEtiquette(),
      this.getM3u8BaseUrl(),
      this.getThumbnail(),
      this.getDuration(),
    ]);

    return {
      title,
      publishDate,
      videoCode,
      titleOriginalJapanese,
      genres,
      series,
      manufacturer,
      etiquette,
      m3u8BaseUrl,
      thumbnail,
      duration,
    };
  }
}
