import { initDatabase, initWishlistTable } from '@/components/database';
import { Colors } from '@/constants/Colors';
import {
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    useFonts,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureFonts, MD3DarkTheme, PaperProvider } from 'react-native-paper';

const AppNavigationTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: Colors.neon.background,
        card: Colors.neon.background,
    },
};

SplashScreen.preventAutoHideAsync();

const fontConfig = {
    fontFamily: 'SpaceGrotesk_400Regular',
};

const customPaperTheme = {
    ...MD3DarkTheme,
    fonts: configureFonts({ config: fontConfig }),
    colors: {
        ...MD3DarkTheme.colors,
        primary: Colors.neon.primary,
        secondary: Colors.neon.secondary,
        background: Colors.neon.background,
        surface: Colors.neon.surface,
        error: Colors.neon.error,
        onPrimary: Colors.neon.onPrimary,
        onSecondary: Colors.neon.onSecondary,
        onSurface: Colors.neon.onSurface,
    },
};

export const unstable_settings = {
    anchor: '(tabs)',
};

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        SpaceGrotesk_400Regular,
        SpaceGrotesk_500Medium,
        SpaceGrotesk_600SemiBold,
        SpaceGrotesk_700Bold,
    });

    useEffect(() => {
        initDatabase();
        initWishlistTable();
    }, []);

    useEffect(() => {
        if (fontsLoaded) {
            // Apply Space Grotesk globally to every RN Text / TextInput
            // that doesn't already set an explicit fontFamily
            if (!Text.defaultProps) (Text as any).defaultProps = {};
            (Text as any).defaultProps.style = { fontFamily: 'SpaceGrotesk_400Regular', color: '#FAFAFA' };
            if (!TextInput.defaultProps) (TextInput as any).defaultProps = {};
            (TextInput as any).defaultProps.style = { fontFamily: 'SpaceGrotesk_400Regular', color: '#FAFAFA' };
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.neon.background }}>
            <PaperProvider theme={customPaperTheme}>
                <ThemeProvider value={AppNavigationTheme}>
                    <Stack
                        screenOptions={{
                            animation: 'slide_from_right',
                            animationDuration: 300,
                            gestureEnabled: true,
                            gestureDirection: 'horizontal',
                            contentStyle: { backgroundColor: Colors.neon.background },
                        }}
                    >
                        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
                        <Stack.Screen
                            name="series/[id]"
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="scanner"
                            options={{
                                headerShown: false,
                                animation: 'slide_from_bottom',
                                animationDuration: 300,
                                presentation: 'modal',
                            }}
                        />
                    </Stack>
                    <StatusBar style="light" />
                </ThemeProvider>
            </PaperProvider>
        </GestureHandlerRootView>
    );
}
