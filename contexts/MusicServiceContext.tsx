import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MusicService = 'Spotify' | 'AppleMusic';

type MusicServiceContextType = {
  musicService: MusicService;
  setMusicService: (service: MusicService) => void;
};

const MusicServiceContext = createContext<MusicServiceContextType | undefined>(undefined);

export const MusicServiceProvider = ({ children }: { children: React.ReactNode }) => {
  const [musicService, setMusicServiceState] = useState<MusicService>('Spotify');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('musicService');
      if (stored === 'AppleMusic' || stored === 'Spotify') {
        setMusicServiceState(stored);
      }
      setLoaded(true);
    };
    load();
  }, []);

  const setMusicService = (service: MusicService) => {
    setMusicServiceState(service);
    AsyncStorage.setItem('musicService', service);
  };

  if (!loaded) return null; // prevent children from rendering until loaded

  return (
    <MusicServiceContext.Provider value={{ musicService, setMusicService }}>
      {children}
    </MusicServiceContext.Provider>
  );
};

export const useMusicService = () => {
  const context = useContext(MusicServiceContext);
  if (!context) {
    throw new Error('useMusicService must be used within a MusicServiceProvider');
  }
  return context;
};

