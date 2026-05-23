/** Video metadata attributes returned by the API */
export interface VideoAttributes {
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
  /** Duration in seconds */
  duration?: number;
}

/** Quality options for HLS stream selection */
export type VideoQuality = 'best' | 'half' | 'worst' | number;

/** Options for searching videos */
export interface SearchOptions {
  /** Maximum number of videos to fetch (default: 50) */
  videoCount?: number;
  /** Maximum number of concurrent requests when resolving video details (default: 10) */
  maxWorkers?: number;
}

/** Summary info for a genre */
export interface GenreInfo {
  name: string;
  slug: string;
  url: string;
}

/** Summary info for a maker/studio */
export interface MakerInfo {
  name: string;
  slug: string;
  url: string;
}

/** Lightweight video info from listing pages (no m3u8 — need to fetch individual page) */
export interface VideoSummary {
  videoCode: string;
  title: string;
  thumbnail: string;
  url: string;
}

/** Result of a browse (genre / maker / new) request */
export interface BrowseResult {
  videos: VideoSummary[];
  page: number;
  totalPages: number;
  title: string;
}

/** Configuration for the HTTP client */
export interface ClientConfig {
  /** Request timeout in seconds (default: 30) */
  timeout?: number;
  /** Custom User-Agent string */
  userAgent?: string;
  /** Proxy URL (e.g. http://user:pass@host:port) */
  proxy?: string;
  /** Whether to enable request caching (default: true) */
  cache?: boolean;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtl?: number;
  /** Whether to enable debug logging */
  debug?: boolean;
}
