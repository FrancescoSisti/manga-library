import { SimplifiedManga } from './mangadex';

const ANILIST_API = 'https://graphql.anilist.co';

const SEARCH_QUERY = `
query ($search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      id
      title { english romaji native }
      description(asHtml: false)
      coverImage { extraLarge large }
      status
      volumes
      genres
      startDate { year }
      staff(perPage: 3, sort: [RELEVANCE, ID]) {
        edges {
          role
          node { name { full } }
        }
      }
    }
  }
}`;

const COVER_QUERY = `
query ($search: String) {
  Media(search: $search, type: MANGA) {
    coverImage { extraLarge large }
  }
}`;

async function anilistPost<T>(query: string, variables: object): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(ANILIST_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

function mapStatus(status: string): string {
    const map: Record<string, string> = {
        FINISHED: 'Finished',
        RELEASING: 'Publishing',
        NOT_YET_RELEASED: 'Upcoming',
        CANCELLED: 'Cancelled',
        HIATUS: 'On Hiatus',
    };
    return map[status] ?? status;
}

function getAuthor(staff: any): string {
    const story = staff?.edges?.find((e: any) => e.role === 'Story' || e.role === 'Story & Art');
    return story?.node?.name?.full ?? staff?.edges?.[0]?.node?.name?.full ?? 'Unknown';
}

function getBestTitle(title: any): string {
    return title?.english ?? title?.romaji ?? title?.native ?? 'Unknown Title';
}

/**
 * Search manga on AniList — returns SimplifiedManga[] for compatibility
 */
export async function searchAniList(query: string, limit: number = 20): Promise<SimplifiedManga[]> {
    const data: any = await anilistPost(SEARCH_QUERY, { search: query, perPage: limit });
    const items: any[] = data?.data?.Page?.media ?? [];
    return items.map(item => ({
        id: `anilist-${item.id}`,
        title: getBestTitle(item.title),
        author: getAuthor(item.staff),
        description: item.description ?? '',
        status: mapStatus(item.status),
        year: item.startDate?.year ?? null,
        coverUrl: item.coverImage?.extraLarge ?? item.coverImage?.large ?? '',
        volumes: item.volumes ?? null,
        tags: item.genres ?? [],
    }));
}

/**
 * Fetch a cover image URL for a given manga title from AniList.
 * Returns null if not found or on error.
 */
export async function getAniListCover(title: string): Promise<string | null> {
    try {
        const data: any = await anilistPost(COVER_QUERY, { search: title });
        const cover = data?.data?.Media?.coverImage;
        return cover?.extraLarge ?? cover?.large ?? null;
    } catch {
        return null;
    }
}
