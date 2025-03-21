import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';
import { getAuth, signInAnonymously } from "firebase/auth";
import { ref, set, onValue, get, child } from "firebase/database";
import { DataSnapshot } from 'firebase/database';
import { useAuth } from "../../contexts/AuthContext";
import { app, database } from "../config/firebase";

const auth = getAuth();
const CLIENT_ID = '9c9e9ac635c74d33b4cec9c1e6878ede';
const REDIRECT_URI = 'exp://192.168.1.6:8081';
const SCOPES = ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public'];


const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// Generate random 6 character user code
function generateUsername(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  console.log("Generated string:", result)
  return result;
}

// Returns true if username exists, false otherwise
async function checkUsernameUniqueness(username: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const dbRef = ref(database, `/users/${username}`); // Direct ref is efficient here

    onValue(dbRef, (snapshot) => {
      resolve(snapshot.exists()); // true if username exists, false otherwise
    }, (error) => {
      reject(error); // Handle errors appropriately
    });
  });
}

// Gets the user code of a given spotify id and null of the user code doesn't exist
async function getSpotifyUserCode(id: string): Promise<string | null> {
  const usersRef = ref(database, 'users');

  const snapshot = await get(usersRef);

  if (snapshot.exists()) {
    for (const username in snapshot.val()) {
      const userProfileRef = child(usersRef, `${username}/userProfile/id`);
      const userProfileSnapshot = await get(userProfileRef);

      if (userProfileSnapshot.exists() && userProfileSnapshot.val() === id) {
        return username;
      }
    }
  }

  return null;
}

export default function HomeScreen() {
  const [token, setLocalToken] = useState<string | null>(null);
  const { setToken, setSpotifyUserId } = useAuth();

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

      setLocalToken(accessToken); // local state if needed
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

      // Authenticate user with Firebase (anonymous sign-in)
      let firebaseUser = auth.currentUser;
      if (!firebaseUser) {
          const userCredential = await signInAnonymously(auth);
          firebaseUser = userCredential.user;
          console.log("Signed in Firebase user:", firebaseUser.uid);
      }
      
      let unique = false;
      let userCode = '';
      while (!unique) {
        userCode = generateUsername();
        unique = !(checkUsernameUniqueness(userCode))
      }

      // Save token and user profile in Firebase Realtime Database
      const userRef = ref(database, `users/${spotifyUserId}`);
      await set(userRef, {
        firebaseUID: firebaseUser.uid, // Store Firebase user ID
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        userProfile, // store the full profile
      });
      console.log("User data stored in Firebase:", userProfile);
    } catch (error) {
      console.error("Token exchange error:", error);
    }
  };


  const fetchUserProfile = async () => {
    try {
        if (!token) {
            console.error("No access token available.");
            return;
        }

        const response = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`, // Use Bearer token for authentication
                "Content-Type": "application/json",
            },
        });

        const userData = await response.json();

        if (response.ok) {
            console.log("Spotify User Profile:", userData);
        } else {
            console.error("Error fetching profile:", userData);
        }
    } catch (error) {
        console.error("User profile fetch error:", error);
    }
};

  return (
    <ThemedView style={styles.overall}>
      <Image
          source={require('@/assets/images/logoTest.png')}
          style={styles.reactLogo}
      />
      <Button 
        icon={() => <Image style={styles.spotifyLogo} source={require('@/assets/images/spotifyLogo.png')}></Image>} 
        style={styles.spotifyButton} 
        mode="elevated"
        labelStyle={{ color: 'white', fontWeight: 'bold', fontSize:20, }}
        onPress={() => promptAsync()}>
          LOG IN WITH SPOTIFY
      </Button>
      <Button 
        icon={() => <Image style={styles.appleLogo} source={require('@/assets/images/appleLogo.png')}></Image>} 
        style={styles.appleButton} 
        mode="elevated"
        labelStyle={{ color: 'black', fontWeight: 'bold', fontSize:17, }}>
          LOG IN WITH APPLE MUSIC
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
    flex:1,
    justifyContent: 'center',
  },
  reactLogo: {
    height: 330,
    width: 800,
    bottom: 0,
    left: 0,
    marginVertical: 20,
    resizeMode: 'contain'
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
    height:40,
    width:40
  },
  appleLogo:{
    height:30,
    width:30,
    resizeMode: 'contain'
  }
});
