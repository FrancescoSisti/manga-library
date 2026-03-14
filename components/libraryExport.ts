import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db, Series, Volume } from './database';

interface ExportData {
    version: number;
    exportedAt: string;
    series: Array<Series & { volumes: Volume[] }>;
    wishlist: Array<{ mangadexId: string; title: string; author: string; totalVolumes: number | null; status: string; coverImage: string }>;
}

export const exportLibrary = async (): Promise<void> => {
    const allSeries = db.getAllSync<Series>('SELECT * FROM Series ORDER BY createdAt ASC');
    const allWishlist = db.getAllSync<any>('SELECT * FROM Wishlist ORDER BY addedAt ASC');

    const seriesWithVolumes = allSeries.map(s => ({
        ...s,
        genres: s.genres,
        volumes: db.getAllSync<Volume>('SELECT * FROM Volumes WHERE seriesId = ?', s.id),
    }));

    const payload: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        series: seriesWithVolumes,
        wishlist: allWishlist,
    };

    const json = JSON.stringify(payload, null, 2);
    const filename = `manga-library-${new Date().toISOString().slice(0, 10)}.json`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Manga Library' });
    }
};

export const importLibrary = async (): Promise<{ imported: number; skipped: number }> => {
    const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) throw new Error('cancelled');

    const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
    const data: ExportData = JSON.parse(content);

    if (!data.series || !Array.isArray(data.series)) throw new Error('Invalid file format');

    let imported = 0;
    let skipped = 0;

    for (const s of data.series) {
        const existing = db.getFirstSync('SELECT id FROM Series WHERE title = ?', s.title);
        if (existing) { skipped++; continue; }

        const ins = db.runSync(
            'INSERT INTO Series (title, author, totalVolumes, status, coverImage, description, genres, mangadexId, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            s.title, s.author, s.totalVolumes, s.status, s.coverImage,
            s.description || null, s.genres || null, s.mangadexId || null, s.sortOrder || 0
        );
        const newId = ins.lastInsertRowId;

        for (const vol of (s.volumes || [])) {
            db.runSync(
                'INSERT OR IGNORE INTO Volumes (seriesId, volumeNumber, isOwned, isRead, price) VALUES (?, ?, ?, ?, ?)',
                newId, vol.volumeNumber, vol.isOwned, vol.isRead, vol.price || 0
            );
        }
        imported++;
    }

    for (const w of (data.wishlist || [])) {
        db.runSync(
            'INSERT OR IGNORE INTO Wishlist (mangadexId, title, author, totalVolumes, status, coverImage) VALUES (?, ?, ?, ?, ?, ?)',
            w.mangadexId, w.title, w.author, w.totalVolumes, w.status, w.coverImage
        );
    }

    return { imported, skipped };
};
