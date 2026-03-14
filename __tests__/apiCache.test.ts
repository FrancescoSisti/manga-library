import { clearCache, getCached, setCached } from '../components/apiCache';

beforeEach(() => {
    clearCache();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('apiCache', () => {
    test('returns null for missing key', () => {
        expect(getCached('nonexistent')).toBeNull();
    });

    test('stores and retrieves data', () => {
        const data = [{ id: 1, title: 'Berserk' }];
        setCached('jikan:berserk', data);
        expect(getCached('jikan:berserk')).toEqual(data);
    });

    test('returns null after TTL expires', () => {
        setCached('jikan:test', { foo: 'bar' });
        // Advance time past the 5-minute TTL
        jest.advanceTimersByTime(6 * 60 * 1000);
        expect(getCached('jikan:test')).toBeNull();
    });

    test('does not expire before TTL', () => {
        setCached('jikan:fresh', { ok: true });
        jest.advanceTimersByTime(4 * 60 * 1000);
        expect(getCached('jikan:fresh')).toEqual({ ok: true });
    });

    test('clearCache removes all entries', () => {
        setCached('a', 1);
        setCached('b', 2);
        clearCache();
        expect(getCached('a')).toBeNull();
        expect(getCached('b')).toBeNull();
    });
});
