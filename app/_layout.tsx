import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useContext } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootNav() {
  const { token, spotifyUserId } = useAuth();
  const isLoggedIn = !!token && !!spotifyUserId;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="login" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="friendProfile" />
      <Stack.Screen name="playlist" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootNav />
        {/* <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }}/>
          <Stack.Screen name="profile" options={{ headerShown: false }}/>
          <Stack.Screen name="friendProfile" options={{ headerShown: false }}/>
          <Stack.Screen name="playlist" options={{ headerShown: false }}/>
        </Stack> */}
        {/* <StatusBar style="auto" /> */}
      </ThemeProvider>
    </AuthProvider>
  );
}
