"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Video = void 0;
const cheerio = __importStar(require("cheerio"));
const cache_1 = require("./cache");
/**
 * Regex to extract m3u8 data from inline JavaScript on the video page.
 * The JS contains: 'm3u8<pipe-separated-data>video'
 */
const M3U8_JS_REGEX = /'m3u8(.*?)video/;
/**
 * Represents a missAV video with full metadata.
 * Fetches and parses the video page HTML to extract all attributes.
 */
class Video {
    url;
    fetcher;
    cache;
    html = null;
    $ = null;
    /** Guard promise to prevent duplicate concurrent fetches */
    loadingPromise = null;
    constructor(url, fetcher, cache) {
        this.url = url;
        this.fetcher = fetcher;
        this.cache = cache ?? new cache_1.Cache();
    }
    /**
     * Fetch the video page HTML if not already loaded.
     * Uses a promise guard to prevent duplicate concurrent fetches.
     */
    async ensureLoaded() {
        if (this.html)
            return;
        // If a fetch is already in progress, wait for it
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        const cached = this.cache.get(`html:${this.url}`);
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
        }
        finally {
            this.loadingPromise = null;
        }
    }
    /**
     * Get all metadata divs from the space-y-2 container.
     * These contain publish date, video code, genres, series, etc.
     */
    getMetaDivs() {
        if (!this.$)
            throw new Error('Page not loaded');
        const container = this.$('div.space-y-2').first();
        return container.find('> div.text-secondary');
    }
    /** The video title (language depends on URL — /en/ or /ja/). */
    async getTitle() {
        await this.ensureLoaded();
        return this.$('h1[class*="text-nord6"]').first().text().trim();
    }
    /** The publish date of the video. */
    async getPublishDate() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        return metaDivs.eq(0).find('time.font-medium').first().text().trim();
    }
    /** The video code (e.g., FC2-PPV-123456). */
    async getVideoCode() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        return metaDivs.eq(1).find('span.font-medium').first().text().trim();
    }
    /** The original Japanese title. */
    async getTitleOriginalJapanese() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        const el = metaDivs.eq(2).find('span.font-medium').first();
        return el.text().trim();
    }
    /** List of genre tags for the video. */
    async getGenres() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        const genres = [];
        metaDivs.eq(3).find('a').each((_, el) => {
            genres.push(this.$(el).text().trim());
        });
        return genres;
    }
    /** The series name. */
    async getSeries() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        const el = metaDivs.eq(4).find('a').first();
        return el.text().trim();
    }
    /** The manufacturer name. */
    async getManufacturer() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        const el = metaDivs.eq(5).find('a').first();
        return el.text().trim();
    }
    /** The "Tag" field (e.g. "FC2", "Caribbeancom" — different from genre). */
    async getTag() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        const el = metaDivs.eq(6).find('span.font-medium').first();
        return el.text().trim();
    }
    /**
     * The maker URL slug extracted from the manufacturer link href.
     * e.g. if manufacturer link is /en/makers/Fc2, returns "Fc2"
     */
    async getMakerSlug() {
        await this.ensureLoaded();
        const metaDivs = this.getMetaDivs();
        const href = metaDivs.eq(5).find('a').first().attr('href');
        if (!href)
            return '';
        // Extract slug from URL like /en/makers/Fc2 or https://missav.ws/en/makers/Fc2
        const match = href.match(/\/makers\/([^/?]+)/i);
        return match?.[1] || '';
    }
    /**
     * The HLS master playlist URL (m3u8).
     *
     * The missav page embeds the stream URL in an inline script in a
     * reversed pipe-delimited format. This reconstructs it.
     */
    async getM3u8BaseUrl() {
        await this.ensureLoaded();
        const match = this.html.match(M3U8_JS_REGEX);
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
    async getThumbnail() {
        await this.ensureLoaded();
        const ogImage = this.$('meta[property="og:image"]').attr('content');
        if (!ogImage) {
            throw new Error('Could not find og:image meta tag');
        }
        return ogImage;
    }
    /** The video duration in seconds. */
    async getDuration() {
        await this.ensureLoaded();
        const durationMeta = this.$('meta[property="video:duration"]').attr('content');
        if (!durationMeta)
            return undefined;
        const parsed = parseInt(durationMeta, 10);
        return isNaN(parsed) ? undefined : parsed;
    }
    /** Get all video attributes in one call. */
    async getAllAttributes() {
        const [title, publishDate, videoCode, titleOriginalJapanese, genres, series, manufacturer, tag, makerSlug, m3u8BaseUrl, thumbnail, duration,] = await Promise.all([
            this.getTitle(),
            this.getPublishDate(),
            this.getVideoCode(),
            this.getTitleOriginalJapanese(),
            this.getGenres(),
            this.getSeries(),
            this.getManufacturer(),
            this.getTag(),
            this.getMakerSlug(),
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
            tag,
            makerSlug,
            m3u8BaseUrl,
            thumbnail,
            duration,
        };
    }
}
exports.Video = Video;
//# sourceMappingURL=video.js.map