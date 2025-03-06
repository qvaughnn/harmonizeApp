import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';

const CLIENT_ID = '9c9e9ac635c74d33b4cec9c1e6878ede';
const REDIRECT_URI = 'harmonize-login://callback';

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

  const exchangeCodeForToken = async (code: string) => {
    try {
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      });

      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const tokenData = await tokenResponse.json();
      setToken(tokenData.access_token);
      console.log('Spotify Token:', tokenData);
    } catch (error) {
      console.error('Token exchange error:', error);
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
