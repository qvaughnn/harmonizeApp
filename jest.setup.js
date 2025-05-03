jest.mock("firebase/app", () => ({
    initializeApp: jest.fn()
}));

jest.mock("firebase/auth", () => ({
    getAuth: jest.fn(),
    initializeAuth: jest.fn(),
    getReactNativePersistence: jest.fn()
}));

jest.mock("firebase/database", () => ({
    __esModule: true,
    getDatabase: jest.fn(() => ({})),
    ref: jest.fn((...args) => args.join("/")),
    set: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve({
        exists: () => true,
        val: () => ({ friend1: true, friend2: true }),
    })),
    remove: jest.fn(() => Promise.resolve())
}));

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);