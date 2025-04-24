// src/services/spotifyAuth.ts
import { app, database } from "../config/firebase";
import { ref, set, update } from "firebase/database";
import { useAuth } from "../../contexts/AuthContext";

const CLIENT_ID = "9c9e9ac635c74d33b4cec9c1e6878ede";

export const refreshSpotifyToken = async (firebaseUid: string, refreshToken: string): Promise<string | null> => {
  const { setToken } = useAuth();
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
    const accessToken = tokenData.access_token;
    console.log("Refreshed Spotify Token:", accessToken);

    //Update Context
    setToken(accessToken);

    // Update Firebase Realtime Database
    const userRef = ref(database, `users/${firebaseUid}/Spotify`);
    await update(userRef, {
      accessToken: tokenData.accessToken,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    });


    return tokenData.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
};
