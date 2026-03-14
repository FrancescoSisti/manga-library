// Mock expo-sqlite so tests can run without native bindings
jest.mock('expo-sqlite', () => {
    const rows: Record<string, any[]> = {};

    const mockDb = {
        execSync: jest.fn(),
        runSync: jest.fn((_sql: string, ..._args: any[]) => ({ lastInsertRowId: 1, changes: 1 })),
        getFirstSync: jest.fn(),
        getAllSync: jest.fn((_sql: string) => []),
    };

    return {
        openDatabaseSync: jest.fn(() => mockDb),
        __mockDb: mockDb,
    };
});
