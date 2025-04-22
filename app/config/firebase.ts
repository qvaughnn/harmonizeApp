// Import necessary functions from Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration (For Web App, IOS and Android in respective files)
const firebaseConfig = {
  apiKey: "AIzaSyDJTEYjC494IJcW1QybCTF0iHRO30eowQA",
  authDomain: "harmonize-37b1a.firebaseapp.com",
  databaseURL: "https://harmonize-37b1a-default-rtdb.firebaseio.com",
  projectId: "harmonize-37b1a",
  storageBucket: "harmonize-37b1a.firebasestorage.app",
  messagingSenderId: "294773082167",
  appId: "1:294773082167:web:8d02532ac3848231d2d7b2",
};

// Initialize Firebase (and database and auth)
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
// const auth = getAuth(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Export the Firebase app instance for use in other parts of the app
export { app, database };
