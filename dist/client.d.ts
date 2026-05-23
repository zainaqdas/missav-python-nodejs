import { Video } from './video';
import type { SearchOptions, ClientConfig, VideoAttributes } from './types';
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
    /** Clean up the fetcher's browser instance. */
    close(): Promise<void>;
    private log;
}
//# sourceMappingURL=client.d.ts.map