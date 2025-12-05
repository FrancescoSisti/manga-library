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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Volumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seriesId INTEGER NOT NULL,
      volumeNumber REAL NOT NULL,
      isOwned INTEGER DEFAULT 0,
      isRead INTEGER DEFAULT 0,
      FOREIGN KEY (seriesId) REFERENCES Series (id) ON DELETE CASCADE
    );
  `);
};

export interface Series {
    id: number;
    title: string;
    author: string;
    totalVolumes: number | null;
    status: string;
    coverImage: string;
    createdAt?: string;
}

export interface Volume {
    id: number;
    seriesId: number;
    volumeNumber: number;
    isOwned: number; // SQLite uses 0/1 for booleans
    isRead: number;
}

export const addSeries = (title: string, author: string, totalVolumes: number | null, status: string, coverImage: string) => {
    return db.runSync(
        'INSERT INTO Series (title, author, totalVolumes, status, coverImage) VALUES (?, ?, ?, ?, ?)',
        title, author, totalVolumes, status, coverImage
    );
};

export const getSeries = (): Series[] => {
    return db.getAllSync<Series>('SELECT * FROM Series ORDER BY createdAt DESC');
};

export const getSeriesById = (id: number): Series | null => {
    return db.getFirstSync<Series>('SELECT * FROM Series WHERE id = ?', id);
};

export const deleteSeries = (id: number) => {
    return db.runSync('DELETE FROM Series WHERE id = ?', id);
};

export const getVolumes = (seriesId: number): Volume[] => {
    return db.getAllSync<Volume>('SELECT * FROM Volumes WHERE seriesId = ?', seriesId);
};

export const toggleVolume = (seriesId: number, volumeNumber: number, isOwned: boolean) => {
    const existing = db.getFirstSync('SELECT * FROM Volumes WHERE seriesId = ? AND volumeNumber = ?', seriesId, volumeNumber);

    if (existing) {
        return db.runSync('UPDATE Volumes SET isOwned = ? WHERE seriesId = ? AND volumeNumber = ?', isOwned ? 1 : 0, seriesId, volumeNumber);
    } else {
        return db.runSync('INSERT INTO Volumes (seriesId, volumeNumber, isOwned) VALUES (?, ?, ?)', seriesId, volumeNumber, isOwned ? 1 : 0);
    }
};

// ========== WISHLIST ==========
export interface WishlistItem {
    id: number;
    malId: number;
    title: string;
    author: string;
    totalVolumes: number | null;
    status: string;
    coverImage: string;
    addedAt?: string;
}

export const initWishlistTable = () => {
    db.execSync(`
        CREATE TABLE IF NOT EXISTS Wishlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            malId INTEGER UNIQUE NOT NULL,
            title TEXT NOT NULL,
            author TEXT,
            totalVolumes INTEGER,
            status TEXT,
            coverImage TEXT,
            addedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

export const addToWishlist = (malId: number, title: string, author: string, totalVolumes: number | null, status: string, coverImage: string) => {
    return db.runSync(
        'INSERT OR IGNORE INTO Wishlist (malId, title, author, totalVolumes, status, coverImage) VALUES (?, ?, ?, ?, ?, ?)',
        malId, title, author, totalVolumes, status, coverImage
    );
};

export const removeFromWishlist = (malId: number) => {
    return db.runSync('DELETE FROM Wishlist WHERE malId = ?', malId);
};

export const getWishlist = (): WishlistItem[] => {
    return db.getAllSync<WishlistItem>('SELECT * FROM Wishlist ORDER BY addedAt DESC');
};

export const isInWishlist = (malId: number): boolean => {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Wishlist WHERE malId = ?', malId);
    return (result?.count ?? 0) > 0;
};

export const isInLibrary = (title: string): boolean => {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Series WHERE title = ?', title);
    return (result?.count ?? 0) > 0;
};
