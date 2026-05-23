import { Video } from './video';
import type { SearchOptions, ClientConfig, VideoAttributes, GenreInfo, MakerInfo, VideoSummary, BrowseResult } from './types';
/**
 * Main client for the missAV API.
 * Provides methods to fetch video metadata and search for videos.
 */
export declare class Client {
    private http;
    private cache;
    private fetcher;
    private config;
    constructor(config?: ClientConfig);
    /**
     * Fetch a video by its missAV URL.
     *
     * @param url - The full video URL (e.g. https://missav.ws/en/fc2-ppv-123456)
     */
    getVideo(url: string): Promise<Video>;
    /**
     * Search for videos on missAV using the Recombee API.
     * Returns an async generator of Video objects.
     *
     * @param query - The search term
     * @param options - Search options (videoCount, maxWorkers)
     */
    search(query: string, options?: SearchOptions): AsyncGenerator<Video, void, undefined>;
    /** Convenience: get video attributes directly without interacting with the Video object. */
    getVideoAttributes(url: string): Promise<VideoAttributes>;
    /** Fetch and cache an HTML page via the fetcher. */
    private fetchPage;
    /**
     * Get the list of all genres from /en/genres.
     */
    getGenreList(): Promise<GenreInfo[]>;
    /**
     * Get the list of all makers/studios from /en/makers.
     */
    getMakerList(page?: number): Promise<MakerInfo[]>;
    /**
     * Extract a video code from an href string. Returns null if no valid code found.
     * Only matches FC2 codes or uppercase JAV codes (avoids CSS class false-positives).
     */
    private extractVideoCode;
    /**
     * Extract video summaries from a listing page HTML.
     */
    private parseVideoGrid;
    /** Estimate total pages from pagination link hrefs. */
    private getTotalPages;
    /**
     * Browse videos by genre.
     */
    browseGenre(genre: string, page?: number): Promise<BrowseResult>;
    /**
     * Browse videos by maker/studio.
     */
    browseMaker(maker: string, page?: number): Promise<BrowseResult>;
    /**
     * Browse newly released videos.
     */
    browseNew(page?: number): Promise<BrowseResult>;
    /**
     * Get related video summaries from a video page.
     */
    getRelatedVideos(url: string): Promise<VideoSummary[]>;
    /** Clean up the fetcher's browser instance. */
    close(): Promise<void>;
    private log;
}
//# sourceMappingURL=client.d.ts.map