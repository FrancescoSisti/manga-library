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

    // Add description column if it doesn't exist (for existing databases)
    try {
        db.execSync('ALTER TABLE Series ADD COLUMN description TEXT');
    } catch (e) { /* Column already exists */ }

    // Add genres column
    try {
        db.execSync('ALTER TABLE Series ADD COLUMN genres TEXT');
    } catch (e) { /* Column already exists */ }

    // Add price column to Volumes
    try {
        db.execSync('ALTER TABLE Volumes ADD COLUMN price REAL DEFAULT 0');
    } catch (e) { /* Column already exists */ }

    // Add sortOrder column to Series
    try {
        db.execSync('ALTER TABLE Series ADD COLUMN sortOrder INTEGER DEFAULT 0');
    } catch (e) { /* Column already exists */ }
};

export interface Series {
    id: number;
    title: string;
    author: string;
    totalVolumes: number | null;
    status: string;
    coverImage: string;
    description?: string;
    genres?: string; // JSON string or comma-separated
    createdAt?: string;
}

export interface Volume {
    id: number;
    seriesId: number;
    volumeNumber: number;
    isOwned: number; // SQLite uses 0/1 for booleans
    isRead: number;
    price?: number;
}

export const addSeries = (title: string, author: string, totalVolumes: number | null, status: string, coverImage: string, description?: string, genres?: string[]) => {
    const genresStr = genres ? JSON.stringify(genres) : null;
    return db.runSync(
        'INSERT INTO Series (title, author, totalVolumes, status, coverImage, description, genres) VALUES (?, ?, ?, ?, ?, ?, ?)',
        title, author, totalVolumes, status, coverImage, description || null, genresStr
    );
};

export const getSeries = (): Series[] => {
    return db.getAllSync<Series>(
        'SELECT * FROM Series ORDER BY CASE WHEN sortOrder > 0 THEN sortOrder ELSE 999999 END ASC, createdAt DESC'
    );
};

export const getSeriesPaginated = (limit: number, offset: number): Series[] => {
    return db.getAllSync<Series>(
        'SELECT * FROM Series ORDER BY CASE WHEN sortOrder > 0 THEN sortOrder ELSE 999999 END ASC, createdAt DESC LIMIT ? OFFSET ?',
        limit, offset
    );
};

export const updateSeriesSortOrders = (orders: Array<{ id: number; sortOrder: number }>) => {
    for (const { id, sortOrder } of orders) {
        db.runSync('UPDATE Series SET sortOrder = ? WHERE id = ?', sortOrder, id);
    }
};

export const getSeriesCount = (): number => {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Series');
    return result?.count ?? 0;
};

export const getSeriesById = (id: number): Series | null => {
    return db.getFirstSync<Series>('SELECT * FROM Series WHERE id = ?', id);
};

export const getSeriesByTitle = (title: string): Series | null => {
    return db.getFirstSync<Series>('SELECT * FROM Series WHERE title = ?', title);
};

export const deleteSeries = (id: number) => {
    return db.runSync('DELETE FROM Series WHERE id = ?', id);
};

export const updateSeriesVolumes = (id: number, totalVolumes: number) => {
    return db.runSync('UPDATE Series SET totalVolumes = ? WHERE id = ?', totalVolumes, id);
};

export const updateSeriesCover = (id: number, coverImage: string) => {
    return db.runSync('UPDATE Series SET coverImage = ? WHERE id = ?', coverImage, id);
};

export const updateSeriesInfo = (id: number, totalVolumes: number | null, description: string | null) => {
    return db.runSync(
        'UPDATE Series SET totalVolumes = ?, description = ? WHERE id = ?',
        totalVolumes, description, id
    );
};

export const getVolumes = (seriesId: number): Volume[] => {
    return db.getAllSync<Volume>('SELECT * FROM Volumes WHERE seriesId = ?', seriesId);
};

export const toggleVolume = (seriesId: number, volumeNumber: number, isOwned: boolean, price?: number) => {
    const existing = db.getFirstSync('SELECT * FROM Volumes WHERE seriesId = ? AND volumeNumber = ?', seriesId, volumeNumber);

    if (existing) {
        // Only update price if provided and non-zero, otherwise keep existing
        let priceUpdate = '';
        const params: any[] = [isOwned ? 1 : 0, seriesId, volumeNumber];

        if (price !== undefined) {
            priceUpdate = ', price = ?';
            params.splice(1, 0, price); // Insert price before seriesId
        }

        // Simpler approach: separate update if price is provided, or just update everything if we don't care about overwriting with 0
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
    // If the table exists without mangadexId, drop and recreate it
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

export const addToWishlist = (mangadexId: string, title: string, author: string, totalVolumes: number | null, status: string, coverImage: string) => {
    return db.runSync(
        'INSERT OR IGNORE INTO Wishlist (mangadexId, title, author, totalVolumes, status, coverImage) VALUES (?, ?, ?, ?, ?, ?)',
        mangadexId, title, author, totalVolumes, status, coverImage
    );
};

export const removeFromWishlist = (mangadexId: string) => {
    return db.runSync('DELETE FROM Wishlist WHERE mangadexId = ?', mangadexId);
};

export const getWishlist = (): WishlistItem[] => {
    return db.getAllSync<WishlistItem>('SELECT * FROM Wishlist ORDER BY addedAt DESC');
};

export const isInWishlist = (mangadexId: string): boolean => {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Wishlist WHERE mangadexId = ?', mangadexId);
    return (result?.count ?? 0) > 0;
};

export const isInLibrary = (title: string): boolean => {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Series WHERE title = ?', title);
    return (result?.count ?? 0) > 0;
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
    // Get total owned volumes
    const ownedResult = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Volumes WHERE isOwned = 1');
    const totalOwnedVolumes = ownedResult?.count ?? 0;

    // Get total volumes (sum of all series totalVolumes)
    const totalResult = db.getFirstSync<{ total: number }>('SELECT SUM(COALESCE(totalVolumes, 0)) as total FROM Series');
    const totalVolumes = totalResult?.total ?? 0;

    // Get Total Value
    const valueResult = db.getFirstSync<{ totalValue: number }>('SELECT SUM(price) as totalValue FROM Volumes WHERE isOwned = 1');
    const totalValue = valueResult?.totalValue ?? 0;

    // Get completed series (where owned count equals totalVolumes)
    const allSeries = db.getAllSync<{ id: number, totalVolumes: number | null, genres: string | null }>('SELECT id, totalVolumes, genres FROM Series');
    let completedSeries = 0;
    const genreCounts: { [key: string]: number } = {};

    for (const series of allSeries) {
        // Calculate completed series
        if (series.totalVolumes && series.totalVolumes > 0) {
            const ownedForSeries = db.getFirstSync<{ count: number }>(
                'SELECT COUNT(*) as count FROM Volumes WHERE seriesId = ? AND isOwned = 1',
                series.id
            );
            if ((ownedForSeries?.count ?? 0) >= series.totalVolumes) {
                completedSeries++;
            }
        }

        // Calculate genres
        if (series.genres) {
            try {
                const genresList = JSON.parse(series.genres) as string[];
                if (Array.isArray(genresList)) {
                    genresList.forEach(genre => {
                        // Simplify genres (take only the first word if it's too long, or group)
                        // For now raw count
                        const cleanGenre = genre.trim();
                        genreCounts[cleanGenre] = (genreCounts[cleanGenre] || 0) + 1;
                    });
                }
            } catch (e) {
                // Ignore parsing errors
                console.log('Error parsing genres for series', series.id, e);
            }
        }
    }

    // Sort and format genres
    const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Top 5
        .map(([name, count]) => ({
            name,
            count,
            percent: Math.round((count / Math.max(1, allSeries.length)) * 100) // Percent of Series containing this genre
        }));

    return {
        totalOwnedVolumes,
        totalVolumes,
        completedSeries,
        totalSeries: allSeries.length,
        totalValue,
        topGenres: sortedGenres
    };
};
