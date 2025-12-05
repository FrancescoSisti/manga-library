import { initDatabase, initWishlistTable } from '@/components/database';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

const customPaperTheme = {
  ...MD3DarkTheme,
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

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initDatabase();
    initWishlistTable();
  }, []);

  return (
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
  );
}
