const esModules = [
    'react-native',
    '@react-native',
    'expo-linear-gradient',
    'expo-image-picker',
    'expo-auth-session',
    'firebase',
    '@firebase',
    'expo',
    'expo-modules-core',
    'unimodules',
    'sentry-expo',
    'native-base'
].join('|');

module.exports = {
    preset: 'jest-expo',
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest'
    },
    transformIgnorePatterns: [`/node_modules/(?!(${esModules})/)`],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: [
        '**/__tests__/**/*.(test|spec).ts?(x)',
        '**/?(*.)+(test|spec).ts?(x)'
    ],
    setupFiles: ['./jest.setup.js']
};