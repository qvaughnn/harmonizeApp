// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { app, database } from "../app/config/firebase";
import { ref, get } from "firebase/database";
import { refreshSpotifyToken } from "../app/services/spotifyAuth";
import { UserRef } from '@/types'; // Adjust if needed


interface AuthContextProps {
  token: string | null;
  setToken: (token: string | null) => void;
  spotifyUserId: string | null;
  setSpotifyUserId: (id: string | null) => void;
  currentUser: UserRef | null;
  setCurrentUser: (user: UserRef | null) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [spotifyUserId, setSpotifyUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserRef | null>(null);
  // const isLoggedIn = !!spotifyUserId;

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
        } else {
          setToken(userData.spotifyAccessToken);
        }
      }
    };
    fetchStoredToken();
  }, [spotifyUserId]);

  return (
    <AuthContext.Provider 
      value={{ 
        token, 
        setToken, 
        spotifyUserId, 
        setSpotifyUserId,
        currentUser,
        setCurrentUser
        }}
      >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
