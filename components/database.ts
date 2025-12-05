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

export const addSeries = (title: string, author: string, totalVolumes: number | null, status: string, coverImage: string) => {
    return db.runSync(
        'INSERT INTO Series (title, author, totalVolumes, status, coverImage) VALUES (?, ?, ?, ?, ?)',
        title, author, totalVolumes, status, coverImage
    );
};

export const getSeries = () => {
    return db.getAllSync('SELECT * FROM Series ORDER BY createdAt DESC');
};

export const getSeriesById = (id: number) => {
    return db.getFirstSync('SELECT * FROM Series WHERE id = ?', id);
};

export const getVolumes = (seriesId: number) => {
    return db.getAllSync('SELECT * FROM Volumes WHERE seriesId = ?', seriesId);
};

export const toggleVolume = (seriesId: number, volumeNumber: number, isOwned: boolean) => {
    const existing = db.getFirstSync('SELECT * FROM Volumes WHERE seriesId = ? AND volumeNumber = ?', seriesId, volumeNumber);

    if (existing) {
        return db.runSync('UPDATE Volumes SET isOwned = ? WHERE seriesId = ? AND volumeNumber = ?', isOwned ? 1 : 0, seriesId, volumeNumber);
    } else {
        return db.runSync('INSERT INTO Volumes (seriesId, volumeNumber, isOwned) VALUES (?, ?, ?)', seriesId, volumeNumber, isOwned ? 1 : 0);
    }
};
