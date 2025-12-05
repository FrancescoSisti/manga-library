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
        primary: '#D946EF', // Fuschia 500
        secondary: '#8B5CF6', // Violet 500
        background: '#09090B', // Zinc 950
        surface: '#18181B', // Zinc 900
        outline: '#27272A', // Zinc 800
        error: '#EF4444',
        onPrimary: '#FFFFFF',
        onSecondary: '#FFFFFF',
        onBackground: '#FAFAFA',
        onSurface: '#E4E4E7',
        onError: '#FFFFFF',
        accent: '#22D3EE', // Cyan 400
        gradientStart: '#4c1d95',
        gradientEnd: '#be185d',
    }
};
