import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';

const CLIENT_ID = '9c9e9ac635c74d33b4cec9c1e6878ede';
const REDIRECT_URI = 'exp://10.140.46.209:8081';

const SCOPES = ['user-read-private', 'user-read-email'];

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function HomeScreen() {
  const [token, setToken] = useState<string | null>(null);

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
    if (token) {
        fetchUserProfile();
    }
}, [token]);

  const exchangeCodeForToken = async (code: string) => {
    try {

      if (!request?.codeVerifier) {
        console.error("Missing code verifier!");
        return;
      }

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: request.codeVerifier,
      });

      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const tokenData = await tokenResponse.json();
    //   setToken(tokenData.access_token);
    //   console.log('Spotify Token:', tokenData);
    // } catch (error) {
    //   console.error('Token exchange error:', error);
    // }
      if (tokenData.error) {
        console.error('Spotify Token Error:', tokenData);
      } else {
        setToken(tokenData.access_token);
        console.log('Spotify Token:', tokenData);
      }
      } catch (error) {
        console.error('Token exchange error:', error);
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
