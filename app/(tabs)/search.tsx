import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, Modal } from 'react-native';
import { GestureHandlerRootView, FlatList } from 'react-native-gesture-handler';
import { Searchbar, List, IconButton, Button, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '../../contexts/AuthContext';
import { database } from '../config/firebase';
import { ref, onValue, set, push, get } from 'firebase/database';
import { Playlist, PlaylistPreview, Song, UserRef } from '@/types';


interface SearchItem {
  id: string;
  name: string;
  type: 'track' | 'album' | 'artist';
  artists?: { name: string }[];
  album?: { images: { url: string }[]; name: string };
  uri?: string;
  duration_ms?: number;
  images?: { url: string }[];
}

const placeholderCover = require('../../assets/images/coverSample.png');

export default function SearchScreen() {
  const { token, currentUser } = useAuth();

  // search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  // playlist picker state
  const [playlistModal, setPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<PlaylistPreview[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SearchItem | null>(null);

  // new playlist modal
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName] = useState('');

  // Load user playlists
  useEffect(() => {
    if (!currentUser?.id) return;
    const userRef = ref(database, `users/${currentUser.id}/userPlaylists`);
    const unsub = onValue(userRef, async (snap) => {
      if (!snap.exists()) { setUserPlaylists([]); return; }
      const ids = Object.keys(snap.val());
      const list: PlaylistPreview[] = [];
      for (const id of ids) {
        const data = await new Promise<any>((resolve) => onValue(ref(database, `playlists/${id}`), s => resolve(s.val()), { onlyOnce: true }));
        if (data) list.push({ id: data.id, name: data.name, cover_art: data.cover_art || placeholderCover });
      }
      setUserPlaylists(list);
    });
    return () => unsub();
  }, [currentUser]);

  // Spotify search
  useEffect(() => {
    const fetchData = async () => {
      if (!token || query.length < 3) { setResults([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          const all: SearchItem[] = [
            ...(data.tracks?.items || []).map((t: any) => ({
              id: t.id,
              name: t.name,
              type: 'track',
              artists: t.artists,
              album: t.album,
              uri: t.uri,
              duration_ms: t.duration_ms,
            })),
            ...(data.albums?.items || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              type: 'album',
              artists: a.artists,
              images: a.images,
            })),
            ...(data.artists?.items || []).map((ar: any) => ({
              id: ar.id,
              name: ar.name,
              type: 'artist',
              images: ar.images,
            })),
          ];
          setResults(all);
        } else {
          console.error('Search error', data);
        }
      } catch (e) {
        console.error('Search fetch error', e);
      } finally { setLoading(false); }
    };
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [query, token]);

  const openPicker = (item: SearchItem) => {
    if (item.type !== 'track') return;
    setSelectedTrack(item);
    setPlaylistModal(true);
  };

  const addTrackToPlaylist = async (plId: string) => {
    if (!selectedTrack || selectedTrack.type !== 'track') return;
    const plSnap = await new Promise<any>((res) => onValue(ref(database, `playlists/${plId}`), s => res(s.val()), { onlyOnce: true }));
    if (!plSnap) return;
    if (plSnap.songs?.some((s: Song) => s.spotify_id === selectedTrack.id)) {
      console.log('Song already exists in playlist');
      setPlaylistModal(false);
      return;
    }
    const newSong: Song = {
      spotify_id: selectedTrack.id,
      name: selectedTrack.name,
      artist: selectedTrack.artists?.map(a => a.name).join(', ') || '',
      spotify_uri: selectedTrack.uri || '',
      duration_ms: selectedTrack.duration_ms || 0,
      cover_art: selectedTrack.album?.images[0]?.url || '',
      album: selectedTrack.album?.name || '',
    };
    const updated = [...(plSnap.songs || []), newSong];
    await set(ref(database, `playlists/${plId}/songs`), updated);
    setPlaylistModal(false);
    setSelectedTrack(null);
  };

  const createPlaylistAndAdd = async () => {
    if (!currentUser?.id || !selectedTrack) return;
    const playlistsRef = ref(database, 'playlists');
    const newRef = push(playlistsRef);
    const id = newRef.key as string;
    const owner = currentUser as UserRef;
    const playlist: Playlist = {
      id,
      name: newName,
      description: '',
      cover_art: placeholderCover,
      owner,
      harmonizers: [owner],
      og_platform: 'harmonize',
      songs: [],
    };
    await set(newRef, playlist);
    await set(ref(database, `users/${currentUser.id}/userPlaylists/${id}`), true);
    setNewName('');
    setNewModal(false);
    addTrackToPlaylist(id);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.overall}>
        <Text variant="displayMedium" style={styles.title}>SEARCH</Text>
        <View style={styles.searchContainer}>
          <Searchbar placeholder="Search songs, albums, artists" value={query} onChangeText={setQuery} style={styles.searchbar} />
        </View>
        {loading ? <ActivityIndicator /> : (
          <FlatList
            data={results}
            keyExtractor={(i) => `${i.type}_${i.id}`}
            renderItem={({ item }) => (
              <List.Item
                style={styles.resultItem}
                title={item.name}
                titleStyle={styles.name}
                description={
                  item.type === 'track'
                    ? `Song - ${item.artists?.map(a => a.name).join(', ')}`
                    : item.type === 'album'
                    ? `Album - ${item.artists?.map(a => a.name).join(', ')}`
                    : 'Artist'
                }
                descriptionStyle={styles.description}
                left={() =>
                  <Image
                    source={{ uri: item.album?.images[0]?.url || item.images?.[0]?.url || '' }}
                    style={styles.thumbnail}
                  />
                }
                right={() =>
                  item.type === 'track' ? (
                    <IconButton
                      icon="plus-circle-outline"
                      size={25}
                      onPress={() => openPicker(item)}
                      style={styles.addIcon}
                      iconColor="white"
                    />
                  ) : null
                }
              />
            )}
          />
        )}

        {/* Playlist picker modal */}
        <Modal visible={playlistModal} transparent onRequestClose={() => setPlaylistModal(false)}>
          <View style={styles.modalWrap}>
            <View style={styles.modalBox}>
              <Text variant="titleLarge">Add to playlist</Text>
              <FlatList
                data={userPlaylists}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 250 }}
                renderItem={({ item }) => (
                  <List.Item
                    title={item.name}
                    titleStyle={styles.modalTitle}
                    left={() => (
                      <Image source={typeof item.cover_art === 'string' ? { uri: item.cover_art } : item.cover_art} style={styles.thumbnail} />
                    )}
                    onPress={() => addTrackToPlaylist(item.id)}
                  />
                )}
              />
              <Button mode="outlined" onPress={() => { setPlaylistModal(false); setNewModal(true); }}>New Playlist</Button>
              <Button onPress={() => setPlaylistModal(false)}>Cancel</Button>
            </View>
          </View>
        </Modal>

        {/* New playlist modal */}
        <Modal visible={newModal} transparent onRequestClose={() => setNewModal(false)}>
          <View style={styles.modalWrap}>
            <View style={styles.modalBox}>
              <Text variant="titleLarge">Create Playlist</Text>
              <TextInput label="Playlist name" mode="outlined" value={newName} onChangeText={setNewName} style={styles.input} />
              <Button mode="contained" onPress={createPlaylistAndAdd} disabled={!newName.trim()}>Create & Add</Button>
              <Button onPress={() => setNewModal(false)}>Cancel</Button>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  overall: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    justifyContent: 'flex-start',
  },

  title: {
    fontWeight: 'bold',
    color: 'darkgrey',
    position: 'absolute',
    top: 80,
    left: 25,
  },

  searchContainer: {
    marginTop: 100,
    width: '90%',
  },
  searchbar: {
    width: '100%',
    marginBottom: 20,
  },

  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 48,    
  },
  name: {
    color: 'white',
  },
  description: {
    color: 'grey',
  },
  addIcon: {
    marginRight: 2,
  },

  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '85%',
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  input: {
    marginVertical: 12,
  },
});