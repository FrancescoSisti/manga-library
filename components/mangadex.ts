import axios from 'axios';

const MANGADEX_API = 'https://api.mangadex.org';
const COVER_BASE_URL = 'https://uploads.mangadex.org/covers';

// Types for MangaDex API responses
export interface MangaDexManga {
    id: string;
    type: string;
    attributes: {
        title: { [key: string]: string };
        altTitles: { [key: string]: string }[];
        description: { [key: string]: string };
        status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
        year: number | null;
        contentRating: string;
        tags: Array<{
            id: string;
            attributes: { name: { en: string } };
        }>;
        lastVolume: string;
        lastChapter: string;
    };
    relationships: Array<{
        id: string;
        type: string;
        attributes?: {
            name?: string;
            fileName?: string;
        };
    }>;
}

export interface MangaDexSearchResult {
    data: MangaDexManga[];
    total: number;
}

export interface SimplifiedManga {
    id: string;
    title: string;
    author: string;
    description: string;
    status: string;
    year: number | null;
    coverUrl: string;
    volumes: number | null;
    tags: string[];
}

/**
 * Get the best title from a MangaDex manga (prefers English)
 */
function getBestTitle(manga: MangaDexManga): string {
    const titles = manga.attributes.title;

    // Try English first
    if (titles.en) return titles.en;

    // Try Japanese romanized
    if (titles['ja-ro']) return titles['ja-ro'];

    // Try any available title
    const firstKey = Object.keys(titles)[0];
    if (firstKey) return titles[firstKey];

    // Check alt titles
    for (const altTitle of manga.attributes.altTitles) {
        if (altTitle.en) return altTitle.en;
    }

    return 'Unknown Title';
}

/**
 * Get author name from manga relationships
 */
function getAuthor(manga: MangaDexManga): string {
    const author = manga.relationships.find(r => r.type === 'author');
    return author?.attributes?.name || 'Unknown Author';
}

/**
 * Get cover image URL from manga relationships
 */
function getCoverUrl(manga: MangaDexManga, size: '256' | '512' = '512'): string {
    const cover = manga.relationships.find(r => r.type === 'cover_art');
    if (!cover?.attributes?.fileName) {
        return 'https://via.placeholder.com/300x400?text=No+Cover';
    }
    return `${COVER_BASE_URL}/${manga.id}/${cover.attributes.fileName}.${size}.jpg`;
}

/**
 * Map MangaDex status to display status
 */
function mapStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
        'ongoing': 'Publishing',
        'completed': 'Finished',
        'hiatus': 'On Hiatus',
        'cancelled': 'Cancelled',
    };
    return statusMap[status] || status;
}

/**
 * Get description in English or first available
 */
function getDescription(manga: MangaDexManga): string {
    const desc = manga.attributes.description;
    if (desc.en) return desc.en;
    if (desc.it) return desc.it; // Italian fallback
    const firstKey = Object.keys(desc)[0];
    return firstKey ? desc[firstKey] : '';
}

/**
 * Search for manga on MangaDex
 */
export async function searchManga(query: string, limit: number = 20): Promise<SimplifiedManga[]> {
    try {
        const response = await axios.get<MangaDexSearchResult>(`${MANGADEX_API}/manga`, {
            params: {
                title: query,
                limit,
                'includes[]': ['cover_art', 'author'],
                contentRating: ['safe', 'suggestive'],
                order: { relevance: 'desc' },
            },
        });

        // Map results WITHOUT fetching volume counts (too slow)
        // Volume counts will be fetched when user adds manga to library
        return response.data.data.map(manga => ({
            id: manga.id,
            title: getBestTitle(manga),
            author: getAuthor(manga),
            description: getDescription(manga),
            status: mapStatus(manga.attributes.status),
            year: manga.attributes.year,
            coverUrl: getCoverUrl(manga),
            volumes: null, // Will be fetched when adding to library
            tags: manga.attributes.tags.map(t => t.attributes.name.en),
        }));
    } catch (error) {
        console.error('MangaDex search error:', error);
        throw error;
    }
}

/**
 * Get the volume count for a manga using the aggregate endpoint
 */
export async function getMangaVolumeCount(mangaId: string): Promise<number | null> {
    try {
        const response = await axios.get(`${MANGADEX_API}/manga/${mangaId}/aggregate`);

        const volumes = response.data?.volumes;
        if (!volumes) return null;

        // Find the highest numbered volume (ignoring "none")
        let maxVolume = 0;
        for (const key of Object.keys(volumes)) {
            if (key !== 'none') {
                const volNum = parseInt(key, 10);
                if (!isNaN(volNum) && volNum > maxVolume) {
                    maxVolume = volNum;
                }
            }
        }

        return maxVolume > 0 ? maxVolume : null;
    } catch (error) {
        console.log('Could not get volume count for', mangaId);
        return null;
    }
}

/**
 * Get detailed manga information
 */
export async function getMangaDetails(mangaId: string): Promise<SimplifiedManga | null> {
    try {
        const response = await axios.get(`${MANGADEX_API}/manga/${mangaId}`, {
            params: {
                'includes[]': ['cover_art', 'author'],
            },
        });

        const manga = response.data.data as MangaDexManga;
        const volumes = await getMangaVolumeCount(mangaId);

        return {
            id: manga.id,
            title: getBestTitle(manga),
            author: getAuthor(manga),
            description: getDescription(manga),
            status: mapStatus(manga.attributes.status),
            year: manga.attributes.year,
            coverUrl: getCoverUrl(manga),
            volumes,
            tags: manga.attributes.tags.map(t => t.attributes.name.en),
        };
    } catch (error) {
        console.error('MangaDex get details error:', error);
        return null;
    }
}
