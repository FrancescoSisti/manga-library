import axios from 'axios';

// Google Books API for getting published volume counts
// API Key can be added for higher rate limits, but works without it for basic usage
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Optional: Add your Google Books API key here for higher rate limits
// Get one at: https://console.cloud.google.com/apis/credentials
const API_KEY = 'AIzaSyDbsREmtW9ihedyGnEfK57x36mfe5cEH-M';

interface GoogleBooksResult {
    totalItems: number;
    items?: Array<{
        id: string;
        volumeInfo: {
            title: string;
            authors?: string[];
            publishedDate?: string;
        };
    }>;
}

/**
 * Extracts volume number from a title like "Dandadan, Vol. 7" or "One Piece 113"
 */
function extractVolumeNumber(title: string): number | null {
    // Match patterns like "Vol. 7", "Volume 7", "Vol 7", "v7", "#7", or just number at end
    const patterns = [
        /vol\.?\s*(\d+)/i,
        /volume\s*(\d+)/i,
        /v(\d+)/i,
        /#(\d+)/i,
        /\s(\d+)$/,
        /,\s*(\d+)$/,
    ];

    for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    return null;
}

/**
 * Gets the highest published volume number for a manga series using Google Books
 * Searches for individual volume entries and finds the maximum
 */
export async function getVolumeCountFromGoogleBooks(seriesTitle: string): Promise<number | null> {
    try {
        // Clean the title - remove common suffixes
        const cleanTitle = seriesTitle
            .replace(/\s*\(manga\)/i, '')
            .replace(/\s*manga$/i, '')
            .trim();

        // Search for volumes of this series
        const params: any = {
            q: `"${cleanTitle}" vol`,
            maxResults: 40,
            printType: 'books',
            orderBy: 'relevance',
        };

        // Add API key if available
        if (API_KEY) {
            params.key = API_KEY;
        }

        const response = await axios.get<GoogleBooksResult>(GOOGLE_BOOKS_API, { params });

        if (!response.data.items || response.data.items.length === 0) {
            console.log(`No Google Books results for "${cleanTitle}"`);
            return null;
        }

        // Extract volume numbers from all matching titles
        const volumeNumbers: number[] = [];

        for (const item of response.data.items) {
            const title = item.volumeInfo.title.toLowerCase();
            const searchTitle = cleanTitle.toLowerCase();

            // Check if this result is actually for our series
            if (title.includes(searchTitle) || searchTitle.includes(title.split(',')[0].trim())) {
                const volNum = extractVolumeNumber(item.volumeInfo.title);
                if (volNum !== null && volNum > 0) {
                    volumeNumbers.push(volNum);
                }
            }
        }

        if (volumeNumbers.length === 0) {
            console.log(`No volume numbers found for "${cleanTitle}"`);
            return null;
        }

        // Return the highest volume number found
        const maxVolume = Math.max(...volumeNumbers);
        console.log(`Google Books: "${cleanTitle}" has up to volume ${maxVolume} (found ${volumeNumbers.length} volumes)`);
        return maxVolume;
    } catch (error) {
        console.error('Google Books API error:', error);
        return null;
    }
}

/**
 * Gets the best volume count from available sources
 * Priority: Jikan/MAL (if available) > Google Books > null
 */
export async function getBestVolumeCount(
    seriesTitle: string,
    jikanVolumes: number | null
): Promise<number | null> {
    // If Jikan already has a volume count (completed series), use it
    if (jikanVolumes !== null && jikanVolumes > 0) {
        return jikanVolumes;
    }

    // For ongoing series, try Google Books
    const googleBooksVolumes = await getVolumeCountFromGoogleBooks(seriesTitle);
    if (googleBooksVolumes && googleBooksVolumes > 0) {
        return googleBooksVolumes;
    }

    // No data available
    return null;
}

export interface VolumeInfo {
    volumeNumber: number;
    title: string;
    coverUrl: string | null;
}

/**
 * Gets individual volume covers from Google Books
 * Returns an array of volumes with their cover images
 */
export async function getVolumesWithCovers(
    seriesTitle: string,
    maxVolumes: number = 50
): Promise<VolumeInfo[]> {
    try {
        const cleanTitle = seriesTitle
            .replace(/\s*\(manga\)/i, '')
            .replace(/\s*manga$/i, '')
            .trim();

        const params: any = {
            q: `"${cleanTitle}" vol`,
            maxResults: 40,
            printType: 'books',
            orderBy: 'relevance',
        };

        if (API_KEY) {
            params.key = API_KEY;
        }

        const response = await axios.get<GoogleBooksResult>(GOOGLE_BOOKS_API, { params });

        if (!response.data.items) {
            return [];
        }

        const volumeMap = new Map<number, VolumeInfo>();

        for (const item of response.data.items) {
            const title = item.volumeInfo.title;
            const searchTitle = cleanTitle.toLowerCase();

            // Check if this result is for our series
            if (!title.toLowerCase().includes(searchTitle) &&
                !searchTitle.includes(title.toLowerCase().split(',')[0].trim())) {
                continue;
            }

            const volNum = extractVolumeNumber(title);
            if (volNum !== null && volNum > 0 && volNum <= maxVolumes) {
                // Only add if we don't have this volume yet (prefer earlier results)
                if (!volumeMap.has(volNum)) {
                    let coverUrl = null;
                    if ((item as any).volumeInfo?.imageLinks?.thumbnail) {
                        // Get higher resolution by replacing zoom parameter
                        coverUrl = (item as any).volumeInfo.imageLinks.thumbnail
                            .replace('zoom=1', 'zoom=2')
                            .replace('http://', 'https://');
                    }

                    volumeMap.set(volNum, {
                        volumeNumber: volNum,
                        title: title,
                        coverUrl,
                    });
                }
            }
        }

        // Convert to sorted array
        return Array.from(volumeMap.values())
            .sort((a, b) => a.volumeNumber - b.volumeNumber);
    } catch (error) {
        console.error('Error fetching volume covers:', error);
        return [];
    }
}

export interface ISBNLookupResult {
    found: boolean;
    seriesTitle?: string;
    volumeNumber?: number;
    fullTitle?: string;
    coverUrl?: string;
    authors?: string[];
    description?: string;
}

/**
 * Looks up a manga volume by ISBN (barcode)
 * Returns the series name and volume number if found
 */
export async function lookupByISBN(isbn: string): Promise<ISBNLookupResult> {
    try {
        const params: any = {
            q: `isbn:${isbn}`,
            maxResults: 1,
        };

        if (API_KEY) {
            params.key = API_KEY;
        }

        const response = await axios.get(GOOGLE_BOOKS_API, { params });

        if (!response.data.items || response.data.items.length === 0) {
            return { found: false };
        }

        const book = response.data.items[0].volumeInfo;
        const title = book.title || '';
        const volumeNumber = extractVolumeNumber(title);

        // Try to extract series name (remove volume info)
        let seriesTitle = title
            .replace(/,?\s*Vol\.?\s*\d+/i, '')
            .replace(/,?\s*Volume\s*\d+/i, '')
            .replace(/\s*\d+$/, '')
            .trim();

        // Get cover
        let coverUrl = null;
        if (book.imageLinks?.thumbnail) {
            coverUrl = book.imageLinks.thumbnail
                .replace('zoom=1', 'zoom=2')
                .replace('http://', 'https://');
        }

        return {
            found: true,
            seriesTitle,
            volumeNumber: volumeNumber || undefined,
            fullTitle: title,
            coverUrl,
            authors: book.authors,
            description: book.description,
        };
    } catch (error) {
        console.error('ISBN lookup error:', error);
        return { found: false };
    }
}
