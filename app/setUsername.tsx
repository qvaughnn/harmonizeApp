import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ref, set } from 'firebase/database';
import { database } from './config/firebase';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';

export default function SetUsernameScreen() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { userToken } = useLocalSearchParams();
  const { setCurrentUser } = useAuth();

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Please enter a valid name');
      return;
    }

    try {
      const auth = getAuth();
      let firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        const userCredential = await signInAnonymously(auth);
        firebaseUser = userCredential.user;
      }

 //     const userCode = generateUserCode(); // You may already have one saved
console.log("This is a firebase user: ", firebaseUser.uid);
//REPLACE userCode with firebase UID
      await set(ref(database, `users/${firebaseUser.uid}/profile`), {
        name: username,
        token: userToken,
        userType: 'AppleMusic',
        createdAt: Date.now(),
        firebaseUID: firebaseUser.uid,
      });

      setCurrentUser({ id: userToken, name: username });
      router.replace('/playlistImport');
    } catch (e) {
      console.error('Error saving username:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Choose a Display Name</Text>
      <TextInput
        label="Display Name"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button mode="contained" onPress={handleSave}>
        Continue
      </Button>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 80 },
  input: { marginVertical: 12 },
  error: { color: 'red', marginBottom: 10 },
});

