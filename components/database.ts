import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('mangaLibrary.db');

export const initDatabase = () => {
    db.execSync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS Series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      totalVolumes INTEGER,
      status TEXT,
      coverImage TEXT,
      description TEXT,
      genres TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Volumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seriesId INTEGER NOT NULL,
      volumeNumber REAL NOT NULL,
      isOwned INTEGER DEFAULT 0,
      isRead INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      FOREIGN KEY (seriesId) REFERENCES Series (id) ON DELETE CASCADE
    );
  `);

    try { db.execSync('ALTER TABLE Series ADD COLUMN description TEXT'); } catch (e) {}
    try { db.execSync('ALTER TABLE Series ADD COLUMN genres TEXT'); } catch (e) {}
    try { db.execSync('ALTER TABLE Volumes ADD COLUMN price REAL DEFAULT 0'); } catch (e) {}
    try { db.execSync('ALTER TABLE Series ADD COLUMN sortOrder INTEGER DEFAULT 0'); } catch (e) {}
    try { db.execSync('ALTER TABLE Series ADD COLUMN mangadexId TEXT'); } catch (e) {}
};

export interface Series {
    id: number;
    title: string;
    author: string;
    totalVolumes: number | null;
    status: string;
    coverImage: string;
    description?: string;
    genres?: string;
    createdAt?: string;
    mangadexId?: string;
}

export interface SeriesWithStats extends Series {
    ownedCount: number;
    readCount: number;
}

export interface Volume {
    id: number;
    seriesId: number;
    volumeNumber: number;
    isOwned: number;
    isRead: number;
    price?: number;
}

const CUSTOM_ORDER_SQL = `ORDER BY CASE WHEN sortOrder > 0 THEN sortOrder ELSE 999999 END ASC, createdAt DESC`;

export const addSeries = (
    title: string, author: string, totalVolumes: number | null,
    status: string, coverImage: string,
    description?: string, genres?: string[], mangadexId?: string
) => {
    const genresStr = genres ? JSON.stringify(genres) : null;
    return db.runSync(
        'INSERT INTO Series (title, author, totalVolumes, status, coverImage, description, genres, mangadexId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        title, author, totalVolumes, status, coverImage, description || null, genresStr, mangadexId || null
    );
};

export const getSeries = (): Series[] =>
    db.getAllSync<Series>(`SELECT * FROM Series ${CUSTOM_ORDER_SQL}`);

export const getSeriesPaginated = (limit: number, offset: number): Series[] =>
    db.getAllSync<Series>(`SELECT * FROM Series ${CUSTOM_ORDER_SQL} LIMIT ? OFFSET ?`, limit, offset);

export const getSeriesCount = (): number => {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Series');
    return result?.count ?? 0;
};

const STATS_SELECT = `
    SELECT s.*,
        COALESCE(SUM(CASE WHEN v.isOwned = 1 THEN 1 ELSE 0 END), 0) as ownedCount,
        COALESCE(SUM(CASE WHEN v.isRead  = 1 THEN 1 ELSE 0 END), 0) as readCount
    FROM Series s
    LEFT JOIN Volumes v ON s.id = v.seriesId
    GROUP BY s.id`;

export const getSeriesPaginatedWithStats = (limit: number, offset: number): SeriesWithStats[] =>
    db.getAllSync<SeriesWithStats>(
        `${STATS_SELECT} ${CUSTOM_ORDER_SQL} LIMIT ? OFFSET ?`, limit, offset
    );

export const getAllSeriesWithStats = (): SeriesWithStats[] =>
    db.getAllSync<SeriesWithStats>(`${STATS_SELECT} ${CUSTOM_ORDER_SQL}`);

export const getSeriesById = (id: number): Series | null =>
    db.getFirstSync<Series>('SELECT * FROM Series WHERE id = ?', id);

export const getSeriesByTitle = (title: string): Series | null =>
    db.getFirstSync<Series>('SELECT * FROM Series WHERE title = ?', title);

export const deleteSeries = (id: number) =>
    db.runSync('DELETE FROM Series WHERE id = ?', id);

export const updateSeriesVolumes = (id: number, totalVolumes: number) =>
    db.runSync('UPDATE Series SET totalVolumes = ? WHERE id = ?', totalVolumes, id);

export const updateSeriesCover = (id: number, coverImage: string) =>
    db.runSync('UPDATE Series SET coverImage = ? WHERE id = ?', coverImage, id);

export const updateSeriesInfo = (id: number, totalVolumes: number | null, description: string | null) =>
    db.runSync('UPDATE Series SET totalVolumes = ?, description = ? WHERE id = ?', totalVolumes, description, id);

export const updateSeriesMangadexId = (id: number, mangadexId: string) =>
    db.runSync('UPDATE Series SET mangadexId = ? WHERE id = ?', mangadexId, id);

export const updateSeriesSortOrders = (orders: Array<{ id: number; sortOrder: number }>) => {
    for (const { id, sortOrder } of orders) {
        db.runSync('UPDATE Series SET sortOrder = ? WHERE id = ?', sortOrder, id);
    }
};

export const getVolumes = (seriesId: number): Volume[] =>
    db.getAllSync<Volume>('SELECT * FROM Volumes WHERE seriesId = ?', seriesId);

export const getSeriesSpend = (seriesId: number): number => {
    const r = db.getFirstSync<{ total: number }>(
        'SELECT COALESCE(SUM(price), 0) as total FROM Volumes WHERE seriesId = ? AND isOwned = 1', seriesId
    );
    return r?.total ?? 0;
};

export const setSeriesVolumePrice = (seriesId: number, price: number) => {
    db.runSync('UPDATE Volumes SET price = ? WHERE seriesId = ?', price, seriesId);
};

export const toggleVolume = (seriesId: number, volumeNumber: number, isOwned: boolean, price?: number) => {
    const existing = db.getFirstSync('SELECT * FROM Volumes WHERE seriesId = ? AND volumeNumber = ?', seriesId, volumeNumber);
    if (existing) {
        if (price) {
            return db.runSync('UPDATE Volumes SET isOwned = ?, price = ? WHERE seriesId = ? AND volumeNumber = ?', isOwned ? 1 : 0, price, seriesId, volumeNumber);
        } else {
            return db.runSync('UPDATE Volumes SET isOwned = ? WHERE seriesId = ? AND volumeNumber = ?', isOwned ? 1 : 0, seriesId, volumeNumber);
        }
    } else {
        return db.runSync('INSERT INTO Volumes (seriesId, volumeNumber, isOwned, price) VALUES (?, ?, ?, ?)', seriesId, volumeNumber, isOwned ? 1 : 0, price || 0);
    }
};

export const toggleVolumeRead = (seriesId: number, volumeNumber: number, isRead: boolean) => {
    const existing = db.getFirstSync('SELECT * FROM Volumes WHERE seriesId = ? AND volumeNumber = ?', seriesId, volumeNumber);
    if (existing) {
        return db.runSync('UPDATE Volumes SET isRead = ? WHERE seriesId = ? AND volumeNumber = ?', isRead ? 1 : 0, seriesId, volumeNumber);
    } else {
        return db.runSync('INSERT INTO Volumes (seriesId, volumeNumber, isOwned, isRead, price) VALUES (?, ?, 0, ?, 0)', seriesId, volumeNumber, isRead ? 1 : 0);
    }
};

// ========== WISHLIST ==========
export interface WishlistItem {
    id: number;
    mangadexId: string;
    title: string;
    author: string;
    totalVolumes: number | null;
    status: string;
    coverImage: string;
    addedAt?: string;
}

export const initWishlistTable = () => {
    try {
        db.getFirstSync('SELECT mangadexId FROM Wishlist LIMIT 1');
    } catch (e) {
        db.execSync('DROP TABLE IF EXISTS Wishlist');
    }
    db.execSync(`
        CREATE TABLE IF NOT EXISTS Wishlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mangadexId TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            author TEXT,
            totalVolumes INTEGER,
            status TEXT,
            coverImage TEXT,
            addedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

export const addToWishlist = (mangadexId: string, title: string, author: string, totalVolumes: number | null, status: string, coverImage: string) =>
    db.runSync(
        'INSERT OR IGNORE INTO Wishlist (mangadexId, title, author, totalVolumes, status, coverImage) VALUES (?, ?, ?, ?, ?, ?)',
        mangadexId, title, author, totalVolumes, status, coverImage
    );

export const removeFromWishlist = (mangadexId: string) =>
    db.runSync('DELETE FROM Wishlist WHERE mangadexId = ?', mangadexId);

export const getWishlist = (): WishlistItem[] =>
    db.getAllSync<WishlistItem>('SELECT * FROM Wishlist ORDER BY addedAt DESC');

export const getWishlistCount = (): number => {
    const r = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Wishlist');
    return r?.count ?? 0;
};

export const getWishlistPaginated = (limit: number, offset: number, sortBy: 'recent' | 'az' | 'za' | 'volumes' = 'recent'): WishlistItem[] => {
    const orderMap = {
        recent:  'addedAt DESC',
        az:      'title ASC',
        za:      'title DESC',
        volumes: 'COALESCE(totalVolumes, 0) DESC',
    };
    return db.getAllSync<WishlistItem>(
        `SELECT * FROM Wishlist ORDER BY ${orderMap[sortBy]} LIMIT ? OFFSET ?`, limit, offset
    );
};

export const isInWishlist = (mangadexId: string): boolean => {
    const r = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Wishlist WHERE mangadexId = ?', mangadexId);
    return (r?.count ?? 0) > 0;
};

export const isInLibrary = (title: string): boolean => {
    const r = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Series WHERE title = ?', title);
    return (r?.count ?? 0) > 0;
};

export interface LibraryStats {
    totalOwnedVolumes: number;
    totalVolumes: number;
    completedSeries: number;
    totalSeries: number;
    totalValue: number;
    topGenres: Array<{ name: string; count: number; percent: number }>;
}

export const getLibraryStats = (): LibraryStats => {
    const ownedResult = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Volumes WHERE isOwned = 1');
    const totalOwnedVolumes = ownedResult?.count ?? 0;

    const totalResult = db.getFirstSync<{ total: number }>('SELECT SUM(COALESCE(totalVolumes, 0)) as total FROM Series');
    const totalVolumes = totalResult?.total ?? 0;

    const valueResult = db.getFirstSync<{ totalValue: number }>('SELECT SUM(price) as totalValue FROM Volumes WHERE isOwned = 1');
    const totalValue = valueResult?.totalValue ?? 0;

    const allSeries = db.getAllSync<{ id: number, totalVolumes: number | null, genres: string | null }>('SELECT id, totalVolumes, genres FROM Series');
    let completedSeries = 0;
    const genreCounts: { [key: string]: number } = {};

    for (const series of allSeries) {
        if (series.totalVolumes && series.totalVolumes > 0) {
            const ownedForSeries = db.getFirstSync<{ count: number }>(
                'SELECT COUNT(*) as count FROM Volumes WHERE seriesId = ? AND isOwned = 1', series.id
            );
            if ((ownedForSeries?.count ?? 0) >= series.totalVolumes) completedSeries++;
        }
        if (series.genres) {
            try {
                const genresList = JSON.parse(series.genres) as string[];
                if (Array.isArray(genresList)) {
                    genresList.forEach(genre => {
                        const g = genre.trim();
                        genreCounts[g] = (genreCounts[g] || 0) + 1;
                    });
                }
            } catch (e) {}
        }
    }

    const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
            name, count,
            percent: Math.round((count / Math.max(1, allSeries.length)) * 100)
        }));

    return { totalOwnedVolumes, totalVolumes, completedSeries, totalSeries: allSeries.length, totalValue, topGenres: sortedGenres };
};
