// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { app, database } from "../app/config/firebase";
import { ref, get } from "firebase/database";
import { refreshSpotifyToken } from "../app/services/spotifyAuth";

interface AuthContextProps {
  token: string | null;
  setToken: (token: string | null) => void;
  spotifyUserId: string | null;
  setSpotifyUserId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [spotifyUserId, setSpotifyUserId] = useState<string | null>(null);

  // On app load, fetch stored token for the current user if needed.
  useEffect(() => {
    const fetchStoredToken = async () => {
      if (!spotifyUserId) return;
      const userRef = ref(database, `users/${spotifyUserId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (Date.now() >= userData.expiresAt) {
          console.log("Token expired, refreshing...");
          const newToken = await refreshSpotifyToken(spotifyUserId, userData.spotifyRefreshToken);
          setToken(newToken);
        } else {
          setToken(userData.spotifyAccessToken);
        }
      }
    };
    fetchStoredToken();
  }, [spotifyUserId]);

  return (
    <AuthContext.Provider value={{ token, setToken, spotifyUserId, setSpotifyUserId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
