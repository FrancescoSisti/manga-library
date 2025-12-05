import { initDatabase } from '@/components/database';
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
  }, []);

  return (
    <PaperProvider theme={customPaperTheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </PaperProvider>
  );
}
