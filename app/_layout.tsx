import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, useRootNavigationState, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useContext } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMusicService, MusicServiceProvider } from "../contexts/MusicServiceContext";
import { Slot, useRouter, usePathname } from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootNav() {
  const { token, spotifyUserId } = useAuth();
  const { musicService } = useMusicService();
  const isLoggedIn = (token && spotifyUserId) || musicService === 'AppleMusic';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="index" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="friendProfile" />
      <Stack.Screen name="playlist" />
      <Stack.Screen name="playlistImport" />
      <Stack.Screen name="connect" />
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
    <MusicServiceProvider>
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
    </MusicServiceProvider>
  );
}


/*
function RootNav() {
  const { token, spotifyUserId } = useAuth();
  const { musicService } = useMusicService();
  const isLoggedIn =
    (token && spotifyUserId) || musicService === 'AppleMusic';


  console.log('musicService:', musicService);
  console.log('isLoggedIn:', isLoggedIn);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="index" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="friendProfile" />
      <Stack.Screen name="playlist" />
      <Stack.Screen name="playlistImport" />
   </Stack>
  );
}*/
/*
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
      <MusicServiceProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootNav />
      </ThemeProvider>
      </MusicServiceProvider>
    </AuthProvider>
  );
}

function RootNav() {
  const { token, spotifyUserId } = useAuth();
  const { musicService } = useMusicService();
  const router = useRouter();
  const pathname = usePathname();

//  const navigationState = useRootNavigationState();

  const isLoggedIn =
    (token && spotifyUserId) || musicService === 'AppleMusic';


  console.log('musicService:', musicService);
  console.log('isLoggedIn:', isLoggedIn);
  console.log("REDIRECTING TO /tabs/home with:");
  console.log("token:", token);
  console.log("pathname:", pathname);


  if (isLoggedIn && pathname === '/index') {
    console.log('🔁 FORCE redirecting to /(tabs)/home');
    router.push('/(tabs)/home');
  }

  return <Slot />;
}



  //  Redirect to /index if not logged in
  useEffect(() => {
    if (!isLoggedIn && pathname !== '/index') {
      console.log('🔒 Not logged in — redirecting to /index');
      router.replace('/index');
    }
  }, [isLoggedIn, pathname]);

  //  Redirect to app if already logged in and on /index
  useEffect(() => {
    if (isLoggedIn && pathname === '/index') {
      console.log('🔓 Logged in — redirecting to /(tabs)/home');
      router.replace('/(tabs)/home');
    }
  }, [isLoggedIn, pathname]);

  return <Slot />;
}



  useEffect(() => {
    // Redirect if not logged in and not on the login screen
    if (!isLoggedIn && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/index') {
        router.replace('/index');
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath === '/index') {
        console.log('Logged in — redirecting to /(tabs)/home');
        router.replace('/(tabs)/home');
      }
    }
  }, [isLoggedIn]);

  return <Slot />;
}


  if (!navigationState?.key){
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }



  if (isLoggedIn) {
    return <Redirect href = "/(tabs)" />;
  }


  return(
    <Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn && <Stack.Screen name="index" />}

      {isLoggedIn && (
      <>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="playlist" />
        <Stack.Screen name="playlistImport" />
      </>
      )}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
*/
