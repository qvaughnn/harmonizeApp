// AppleAuth.js
import { View, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getAuth, signInWithCredential, OAuthProvider } from "firebase/auth";
// import auth from '@react-native-firebase/auth';

  export const signInWithApple = async () => {
    try {
      // Request Apple authentication
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Create Firebase credential
//      const { identityToken } = appleCredential;
 //     if (!identityToken) {
  //      throw new Error("No identity token returned");
 //     }
 //     const provider = auth.AppleAuthProvider;
 //     const credential = provider.credential(identityToken);
      
      // Sign in to Firebase with credential
 //     const userCredential = await auth().signInWithCredential(credential);
  //    console.log('User signed in with Apple:', userCredential.user);
      
      // Now proceed to MusicKit authorization

      // Extract identity token
      const { identityToken } = appleCredential;
      if (!identityToken) {
        throw new Error("No identity token returned from Apple");
      }

      // Initialize Firebase Auth
      const auth = getAuth();
      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({ idToken: identityToken });

      // Sign in to Firebase with Apple credential
      const userCredential = await signInWithCredential(auth, credential);
      console.log('User signed in with Apple:', userCredential.user);

      return userCredential.user;
    } catch (error) {
      console.error('Apple authentication error:', error);
      Alert.alert('Authentication failed', error.message);
      return null;
    }
};
