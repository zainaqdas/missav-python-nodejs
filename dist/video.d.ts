import type { VideoAttributes } from './types';
import { Cache } from './cache';
import { CloudflareFetcher } from './fetcher';
/**
 * Represents a missAV video with full metadata.
 * Fetches and parses the video page HTML to extract all attributes.
 */
export declare class Video {
    readonly url: string;
    private fetcher;
    private cache;
    private html;
    private $;
    /** Guard promise to prevent duplicate concurrent fetches */
    private loadingPromise;
    constructor(url: string, fetcher: CloudflareFetcher, cache?: Cache);
    /**
     * Fetch the video page HTML if not already loaded.
     * Uses a promise guard to prevent duplicate concurrent fetches.
     */
    private ensureLoaded;
    /**
     * Get all metadata divs from the space-y-2 container.
     * These contain publish date, video code, genres, series, etc.
     */
    private getMetaDivs;
    /** The video title (language depends on URL — /en/ or /ja/). */
    getTitle(): Promise<string>;
    /** The publish date of the video. */
    getPublishDate(): Promise<string>;
    /** The video code (e.g., FC2-PPV-123456). */
    getVideoCode(): Promise<string>;
    /** The original Japanese title. */
    getTitleOriginalJapanese(): Promise<string>;
    /** List of genre tags for the video. */
    getGenres(): Promise<string[]>;
    /** The series name. */
    getSeries(): Promise<string>;
    /** The manufacturer. */
    getManufacturer(): Promise<string>;
    /** The etiquette / label. */
    getEtiquette(): Promise<string>;
    /**
     * The HLS master playlist URL (m3u8).
     *
     * The missav page embeds the stream URL in an inline script in a
     * reversed pipe-delimited format. This reconstructs it.
     */
    getM3u8BaseUrl(): Promise<string>;
    /** The video thumbnail URL. */
    getThumbnail(): Promise<string>;
    /** Get all video attributes in one call. */
    getAllAttributes(): Promise<VideoAttributes>;
}
//# sourceMappingURL=video.d.ts.map