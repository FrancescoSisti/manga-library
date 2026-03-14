import * as SQLite from 'expo-sqlite';

// Get the mock DB instance
const mockDb = (SQLite as any).__mockDb;

// Import database module AFTER mocking
import {
    addSeries,
    addToWishlist,
    deleteSeries,
    isInLibrary,
    isInWishlist,
    removeFromWishlist,
    toggleVolume,
    toggleVolumeRead,
    updateSeriesVolumes,
} from '../components/database';

beforeEach(() => {
    jest.clearAllMocks();
    mockDb.runSync.mockReturnValue({ lastInsertRowId: 1, changes: 1 });
    mockDb.getFirstSync.mockReturnValue(null);
    mockDb.getAllSync.mockReturnValue([]);
});

describe('Series CRUD', () => {
    test('addSeries calls INSERT with correct params', () => {
        addSeries('Berserk', 'Kentaro Miura', 41, 'Finished', 'https://cover.url', 'Dark fantasy manga', ['Action', 'Fantasy']);
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO Series'),
            'Berserk',
            'Kentaro Miura',
            41,
            'Finished',
            'https://cover.url',
            'Dark fantasy manga',
            expect.any(String) // genres JSON
        );
    });

    test('deleteSeries calls DELETE with correct id', () => {
        deleteSeries(42);
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM Series WHERE id = ?'),
            42
        );
    });

    test('updateSeriesVolumes calls UPDATE with correct params', () => {
        updateSeriesVolumes(7, 99);
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE Series SET totalVolumes'),
            99,
            7
        );
    });
});

describe('isInLibrary', () => {
    test('returns true when count > 0', () => {
        mockDb.getFirstSync.mockReturnValue({ count: 1 });
        expect(isInLibrary('Berserk')).toBe(true);
    });

    test('returns false when count is 0', () => {
        mockDb.getFirstSync.mockReturnValue({ count: 0 });
        expect(isInLibrary('Unknown Manga')).toBe(false);
    });
});

describe('Volume toggle', () => {
    test('toggleVolume inserts when volume does not exist', () => {
        mockDb.getFirstSync.mockReturnValue(null);
        toggleVolume(1, 3, true);
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO Volumes'),
            1, 3, 1, 0
        );
    });

    test('toggleVolume updates when volume exists', () => {
        mockDb.getFirstSync.mockReturnValue({ id: 10, seriesId: 1, volumeNumber: 3, isOwned: 0 });
        toggleVolume(1, 3, true);
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE Volumes SET isOwned'),
            1, 1, 3
        );
    });

    test('toggleVolumeRead inserts isRead when volume does not exist', () => {
        mockDb.getFirstSync.mockReturnValue(null);
        toggleVolumeRead(1, 5, true);
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO Volumes'),
            1, 5, 1
        );
    });
});

describe('Wishlist', () => {
    test('addToWishlist calls INSERT OR IGNORE', () => {
        addToWishlist('mal123', 'One Piece', 'Oda', 110, 'Publishing', 'https://cover.url');
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('INSERT OR IGNORE INTO Wishlist'),
            'mal123', 'One Piece', 'Oda', 110, 'Publishing', 'https://cover.url'
        );
    });

    test('removeFromWishlist calls DELETE', () => {
        removeFromWishlist('mal123');
        expect(mockDb.runSync).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM Wishlist WHERE mangadexId = ?'),
            'mal123'
        );
    });

    test('isInWishlist returns true when found', () => {
        mockDb.getFirstSync.mockReturnValue({ count: 1 });
        expect(isInWishlist('mal123')).toBe(true);
    });

    test('isInWishlist returns false when not found', () => {
        mockDb.getFirstSync.mockReturnValue({ count: 0 });
        expect(isInWishlist('mal999')).toBe(false);
    });
});
