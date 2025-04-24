import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
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
  const { setCurrentUser } = useAuth();
  const auth = getAuth();

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
          
          // If Spotify token exists, check if it needs refresh
          if (userData.Spotify?.accessToken) {
            const userSpotifyRef = ref(database, `users/${userCredential.user.uid}/Spotify`);
            const spotifySnapshot = await get(userSpotifyRef);
            refreshSpotifyToken(userCredential.user.uid, spotifySnapshot?.val().refreshToken);
            // Navigate to home page
            router.replace('/home');
          } else {
            // No music service connected yet
            router.replace('/connect');
          }
        } else {
          // User exists but no profile
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

  return (
    <ThemedView style={styles.container}>
      <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      
      <Button
        mode="contained"
        onPress={handleAuth}
        style={styles.button}
      >
        {isLogin ? 'Login' : 'Sign Up'}
      </Button>
      
      <Button
        mode="text"
        onPress={() => setIsLogin(!isLogin)}
        style={styles.switchButton}
      >
        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
  switchButton: {
    marginTop: 20,
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});
