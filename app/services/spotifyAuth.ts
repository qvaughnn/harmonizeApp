// src/services/spotifyAuth.ts
import { router } from "expo-router";
import { app, database } from "../config/firebase";
import { ref, set, update } from "firebase/database";

const CLIENT_ID = '9c9e9ac635c74d33b4cec9c1e6878ede';

export const refreshSpotifyToken = async (firebaseUid: string, refreshToken: string) => {
  try {
    console.log("Starting token refresh process");
    const url = "https://accounts.spotify.com/api/token";
    const params = new URLSearchParams({
      grant_type:'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    });

    const body = params.toString();

    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body,
    };
    const response = await fetch(url, payload);

    const tokenData = await response.json();
    console.log("Token refresh response:", tokenData); // Debug log

    if (tokenData.error) {
      console.error("Error refreshing token:", tokenData);
      console.log("Redirecting to connect");
      router.replace('./connect');
      return null;
    }

    // Update Firebase Realtime Database
    const userRef = ref(database, `users/${firebaseUid}/Spotify`);
    await update(userRef, {
      accessToken: tokenData.access_token, // Fix: was tokenData.accessToken
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    });

    return tokenData.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error; // Rethrow to handle in calling function
  }
};
