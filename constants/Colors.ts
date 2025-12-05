/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        text: '#11181C',
        background: '#fff',
        tint: tintColorLight,
        icon: '#687076',
        tabIconDefault: '#687076',
        tabIconSelected: tintColorLight,
    },
    dark: {
        text: '#ECEDEE',
        background: '#151718',
        tint: tintColorDark,
        icon: '#9BA1A6',
        tabIconDefault: '#9BA1A6',
        tabIconSelected: tintColorDark,
    },
    // Custom theme colors
    neon: {
        primary: '#BB86FC',
        secondary: '#03DAC6',
        background: '#121212',
        surface: '#1E1E1E',
        error: '#CF6679',
        onPrimary: '#000000',
        onSecondary: '#000000',
        onBackground: '#FFFFFF',
        onSurface: '#FFFFFF',
        onError: '#000000',
        accent: '#00e5ff', // bright cyan
    }
};
