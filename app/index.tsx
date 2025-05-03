import { useRef, useEffect, useState } from 'react';
import { Animated, StyleSheet,  TextInput, Image, View} from 'react-native';
import {Button, Text} from 'react-native-paper';
import { ThemedView } from '@/components/ThemedView';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { ref, get } from 'firebase/database';
import { database } from './config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { refreshSpotifyToken } from './services/spotifyAuth';

export default function Authentication() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const { setToken, setCurrentUser } = useAuth();
  const auth = getAuth();
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [showSplash, setShowSplash] = useState(true);

  const handleAuth = async () => {
    try {
      setError('');
      let userCredential;
      
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in" + userCredential.user + userCredential.user.uid)

        // Check if user has linked music services
        const userRef = ref(database, `users/${userCredential.user.uid}/profile`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setCurrentUser({
            id: userCredential.user.uid,
            name: userData.displayName || email,
          });

          const userSpotifyRef = ref(database, `users/${userCredential.user.uid}/Spotify`);
          const spotifySnapshot = await get(userSpotifyRef);
          const spotifyData = spotifySnapshot?.val();

          // If Spotify token exists, check if it needs refresh
          if (spotifyData && spotifyData.accessToken) {
            console.log("Found Spotify data:", spotifyData)
            const now = Date.now();
            if (now >= spotifyData.expiresAt) {
              console.log("Token expired, attempting refresh")
              // Token is expired, refresh it
              try {
                // router.replace('/connect');
                setToken(await refreshSpotifyToken(userCredential.user.uid, spotifyData.refreshToken));
                console.log("Spotify token refresh completed");
              } catch (error) {
                console.error("Error refreshing token:", error);
              }
            }
            setToken(spotifyData.accessToken);
            console.log("Now going to home");
            // Navigate to home page
            router.replace('/(tabs)/home');
          } else {
            // No music service connected yet
            console.log("No music service connected yet");
            router.replace('/connect');
          }
        } else {
          // User exists but no profile
          console.log("User exists but no profile")
          router.replace('/connect');
        }
      } else {
        // New user registration
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Signed up" + userCredential.user + userCredential.user.uid)
        //Not sure about this yet
//      const friendCode = await generateUniqueFriendCode();          // new util (see §4)
//      await set(userRef, { email, displayName: email, friendCode });
        // New users always go to index to connect music service
        router.replace('/connect');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    // Sequence: hold at 1, then fade out to 0
    Animated.sequence([
      Animated.delay(500),                   // optional pause before fading
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSplash(false);
    });
  }, [splashOpacity]);

  return (
    <View style={styles.wrapper}>
    <ThemedView style={styles.container}>
      <Image
          source={require('@/assets/images/fadeIn.png')}
          style={styles.reactLogo}
      />
      <Text style={styles.title}>{isLogin ? 'HARMONIZE LOGIN' : 'HARMONIZE SIGNUP'}</Text>
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={[
          styles.input,
          {
            backgroundColor: 'white',
          }
        ]}
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[
          styles.input,
          {
            backgroundColor: 'white',
          }
        ]}
      />
      
      <Button 
        style={styles.button} 
        mode="elevated"
        labelStyle={{ color: 'white', fontWeight: 'bold', fontSize:20, }}
        onPress={handleAuth}>
          {isLogin ? 'Login' : 'Sign Up'}
      </Button>
      
      <Button
        mode="text"
        onPress={() => setIsLogin(!isLogin)}
        style={styles.switchButton}
        labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: 15, }}
      >
        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </Button>
    </ThemedView>
    {showSplash && (
      <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
        <Image
          source={require('@/assets/images/fadeIn3.png')}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </Animated.View>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 35,
    marginBottom: 40,
    textAlign: 'center',
    color: 'grey',
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
    elevation: 5,
    borderRadius: 20,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    paddingHorizontal: 12,
    height: 48,
  },
  button: {
    marginTop: 25,
    backgroundColor: '#76448A',
  },
  switchButton: {
    marginTop: 20,
    fontWeight: 'bold',
    color: 'white',
    fontSize: 100,
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  reactLogo: {
    height: '50%',
    width: '100%',
    // marginVertical: 5,
  },
  splash: {
    ...StyleSheet.absoluteFillObject,    // top:0,left:0,right:0,bottom:0
    backgroundColor: '#fff',              // or your brand color
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
  wrapper: { flex: 1 },
});
