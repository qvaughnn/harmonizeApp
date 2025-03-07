// src/services/spotifyAuth.ts
import { app, database } from "../config/firebase";
import { ref, set } from "firebase/database";

const CLIENT_ID = "9c9e9ac635c74d33b4cec9c1e6878ede";

export const refreshSpotifyToken = async (spotifyUserId: string, refreshToken: string): Promise<string | null> => {
  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const tokenData = await response.json();
    if (tokenData.error) {
      console.error("Error refreshing token:", tokenData);
      return null;
    }

    console.log("Refreshed Spotify Token:", tokenData.access_token);

    // Update Firebase Realtime Database
    const userRef = ref(database, `users/${spotifyUserId}`);
    await set(userRef, {
      spotifyAccessToken: tokenData.access_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      // You might want to retain the refresh token too if it's provided
    });

    return tokenData.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
};
