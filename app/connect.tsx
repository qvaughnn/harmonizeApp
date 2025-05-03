import { Image, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Button } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, set, get, } from "firebase/database";
import { useAuth } from "../contexts/AuthContext";
import { database, fireDB } from "./config/firebase";
import { useRouter } from 'expo-router';
import { useMusicService } from '../contexts/MusicServiceContext';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { decode as atob } from 'base-64';
import { getFirestore } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";



const CLIENT_ID = '9c9e9ac635c74d33b4cec9c1e6878ede';
const REDIRECT_URI = 'exp://10.140.221.168:8081';
const SCOPES = ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public'];

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

async function generateUniqueFriendCode(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  let exists = true;

  while (exists) {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

    const snap = await get(ref(database, `friendCodes/${code}`));
    exists = snap.exists();
  }

  //  map code -> uid for quick reverse lookup if we need it later
  await set(ref(database, `friendCodes/${code}`), true);
  return code;
}

export default function ConnectScreen() {
  const { setToken, setSpotifyUserId, setCurrentUser } = useAuth();
  const router = useRouter();
  const { setMusicService } = useMusicService();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      exchangeCodeForToken(response.params.code);
    }
  }, [response]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // No user is signed in, redirect to authentication
        router.replace('/');
      }
    });

    return () => unsubscribe();
  }, []);


  const handleAppleMusicLogin = async () => {
    console.log("Starting Apple Music authentication");
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        'https://tangerine-scone-fefb23.netlify.app',
        'myapp://auth'
      );

      if (result.type === 'success' && result.url.includes('token=')) {
        console.log("Apple Music authentication successful");
        const { queryParams } = Linking.parse(result.url);
        const encodedToken = queryParams?.token;

        console.log("Encoded token:", encodedToken);
        const decodedBase64 = decodeURIComponent(encodedToken);
        const userToken = atob(decodedBase64);
        console.log("Decoded token:", userToken);

        setMusicService('AppleMusic');
        setSpotifyUserId(userToken);

        // Store Apple Music token in Firebase if needed
        const firebaseUser = getAuth().currentUser;
        if (firebaseUser) {
          await set(ref(database, `users/${firebaseUser.uid}/AppleMusic`), {
            uToken: userToken,
            expiresAt: Date.now() + 3600 * 1000 // 1 hour expiration
          });
        }

        setCurrentUser({
          id: firebaseUser.uid ??  'Unknown User ID',
          name: 'Apple User',
          uToken: userToken,
        });

        router.push({
          pathname: '/setUsername',
          params: { userToken }
        });
      } else {
        console.log('Apple Music authentication cancelled or failed:', result);
      }
    } catch (error) {
      console.error("Apple Music authentication error:", error);
    }
  };

  // Exchange code for token and store user data in Firebase
  const exchangeCodeForToken = async (code: string) => {
    try {
      if (!request?.codeVerifier) {
        console.error("Missing code verifier!");
        return;
      }

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: request.codeVerifier,
      });

      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) {
        console.error("Spotify Token Error:", tokenData);
        return;
      }
      console.log("Spotify Token:", tokenData);
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      setToken(accessToken); // update global context

      // Fetch the Spotify user profile to get the Spotify User ID
      const userProfileResponse = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const userProfile = await userProfileResponse.json();
      if (!userProfile.id) {
        console.error("Error fetching user profile:", userProfile);
        return;
      }

      const spotifyUserId = userProfile.id;
      setSpotifyUserId(spotifyUserId);
      setMusicService('Spotify');

      // Authenticate user with Firebase 
      const firebaseUser = getAuth().currentUser;
      if (!firebaseUser) {
        console.error("No Firebase user! (User must log in first)");
        router.replace('/');                                         // back to auth screen
        return;
      }

      // Create user profile in Firebase
      const profileRef = ref(database, `users/${firebaseUser.uid}/profile`);
      const profileSnap = await get(profileRef);

      let friendCode: string;
      if (profileSnap.exists() && profileSnap.val().friendCode) {
        friendCode = profileSnap.val().friendCode;
      } else {
        friendCode = await generateUniqueFriendCode();
        await set(profileRef, {
          displayName: userProfile.display_name,
          email: firebaseUser.email,
          friendCode,
        });
      }

      //Saving user ref to Context
      setCurrentUser({
        id: firebaseUser.uid ?? 'Unknown User ID',
        name: userProfile.display_name ?? 'Unknown User',
      });

      // Save token and user profile in Firebase Realtime Database
      const userRef = ref(database, `users/${firebaseUser.uid}/Spotify`)
      await set(userRef, {
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        userProfile,
      });
      console.log("User music service connected and logged in:", firebaseUser.uid)
      console.log("User data stored in Firebase:", userProfile);
    } catch (error) {
      console.error("Token exchange error:", error);
    }

    router.replace('/playlistImport'); 

  };

  return (
    <ThemedView style={styles.overall}>
      <Image
        source={require('@/assets/images/fadeIn.png')}
        style={styles.reactLogo}
      />
      <Button
        icon={() => <Image style={styles.spotifyLogo} source={require('@/assets/images/spotifyLogo.png')}></Image>}
        style={styles.spotifyButton}
        mode="elevated"
        labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: 20, }}
        onPress={() => promptAsync()}>
        LOG IN WITH SPOTIFY
      </Button>
      <Button
        icon={() => <Image style={styles.appleLogo} source={require('@/assets/images/appleLogo.png')}></Image>}
        style={styles.appleButton}
        mode="elevated"
        labelStyle={{ color: 'black', fontWeight: 'bold', fontSize: 17, }}
        onPress={handleAppleMusicLogin}
        >
        LOG IN WITH APPLE MUSIC
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  reactLogo: {
    height: '50%',
    width: '100%',
  },
  spotifyButton: {
    backgroundColor: '#1BB954',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'black', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginVertical: 20,
  },
  appleButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'black', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginVertical: 20,
  },
  spotifyLogo: {
    height: 40,
    width: 40
  },
  appleLogo: {
    height: 30,
    width: 30,
    resizeMode: 'contain'
  }
});
