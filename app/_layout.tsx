import { initDatabase, initWishlistTable } from '@/components/database';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    useFonts,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureFonts, MD3DarkTheme, PaperProvider } from 'react-native-paper';

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
    const colorScheme = useColorScheme();

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
            (Text as any).defaultProps.style = { fontFamily: 'SpaceGrotesk_400Regular' };
            if (!TextInput.defaultProps) (TextInput as any).defaultProps = {};
            (TextInput as any).defaultProps.style = { fontFamily: 'SpaceGrotesk_400Regular' };
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <PaperProvider theme={customPaperTheme}>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <Stack
                        screenOptions={{
                            animation: 'slide_from_right',
                            animationDuration: 300,
                            gestureEnabled: true,
                            gestureDirection: 'horizontal',
                        }}
                    >
                        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
                        <Stack.Screen
                            name="series/[id]"
                            options={{
                                headerShown: false,
                                animation: 'slide_from_bottom',
                                animationDuration: 400,
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
