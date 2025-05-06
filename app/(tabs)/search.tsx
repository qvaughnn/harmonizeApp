import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, Modal } from 'react-native';
import { GestureHandlerRootView, FlatList } from 'react-native-gesture-handler';
import { Searchbar, List, IconButton, Button, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '../../contexts/AuthContext';
import { database, fireDB } from '../config/firebase';
import { ref, onValue, set, push, get } from 'firebase/database';
import { useMusicService } from '../../contexts/MusicServiceContext'; // Kept from original code
import { Playlist, PlaylistPreview, Song, UserRef } from '@/types';
import { useRouter } from 'expo-router';
import { collection, getDocs } from "firebase/firestore"; 

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
  const router = useRouter();
  const { musicService } = useMusicService(); // Get the music service from context

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

  // successful modal
  const [successModal, setSuccessModal] = useState(false);


  const getFirestore = async () => {
  const querySnapshot = await getDocs(collection(fireDB, "privKey"));
  for (const doc of querySnapshot.docs) {
    const data = doc.data();
    if (data.devToken) {
      return data.devToken;
    }
  }
  };


  useEffect(() => {
  const fetchFirestoreData = async () => {
    try {
      await getFirestore(); // Call the function here
    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
    }
  };

  fetchFirestoreData();
}, []);

  // Load user playlists
  useEffect(() => {
    if (!currentUser?.id) return;
    const userRef = ref(database, `users/${currentUser.id}/userPlaylists`);
    const unsub = onValue(userRef, async (snap) => {
      if (!snap.exists()) { setUserPlaylists([]); return; }
      const ids = Object.keys(snap.val());

      // Create an array of Promises using get()
      const promises = ids.map(id => get(ref(database, `playlists/${id}`)));

      // Wait for all promises to resolve
      const snapshots = await Promise.all(promises);

      // Process the results
      const list: PlaylistPreview[] = snapshots
        .map(s => s.val()) // Get the data from each snapshot
        .filter(data => data) // Filter out any null/non-existent playlists
        .map(data => ({
          id: data.id,
          name: data.name,
          cover_art: data.cover_art || placeholderCover
        }));

      setUserPlaylists(list);
    });
    return () => {
      unsub();
      console.log('Search Page Playlists unmounted');
    }
  }, []);

  // Search functionality with support for both Spotify and Apple Music
  useEffect(() => {
    const fetchData = async () => {
      if (query.length < 3) { 
        setResults([]); 
        return; 
      }
      
      setLoading(true);
      
      try {
        if (musicService !== 'AppleMusic') {
          // Spotify search
          if (!token) {
            console.error("Token is missing for Spotify search!");
            setLoading(false);
            return;
          }
          

          console.log("This is a TOKEN: ", token);

 
          const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          console.log("This is a search RESPONSE: ", res);


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
            console.error('Spotify search error', data);
          }
        } else {
          // Apple Music search
          const appleDev = await getFirestore()
          const response = await fetch(
            `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(query)}&types=songs,albums,artists&limit=10`,
            {
              headers: {
                Authorization: `Bearer ${appleDev}`,
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Apple Music Search Error:", response.status, errorText);
            return;
          }

          const data = await response.json();
          const songs = data.results?.songs?.data || [];
          const albums = data.results?.albums?.data || [];
          const artists = data.results?.artists?.data || [];

          const normalizedResults = [...songs, ...albums, ...artists].map((item: any) => ({
            id: item.id,
            name: item.attributes?.name || 'Unknown',
            type: item.type === 'songs' ? 'track' : item.type === 'albums' ? 'album' : 'artist',
            artists: item.attributes?.artistName ? [{ name: item.attributes.artistName }] : [],
            images: item.attributes?.artwork?.url
              ? [{ url: item.attributes.artwork.url.replace('{w}x{h}', '200x200') }]
              : [],
            album: item.attributes?.artwork?.url
              ? { 
                  images: [{ url: item.attributes.artwork.url.replace('{w}x{h}', '200x200') }],
                  name: item.attributes?.albumName || 'Unknown Album'
                }
              : undefined,
            uri: item.attributes?.playParams?.catalogId || item.id,
            duration_ms: item.attributes?.durationInMillis || 0,
          }));

          setResults(normalizedResults);
        }
      } catch (e) {
        console.error('Search fetch error', e);
      } finally { 
        setLoading(false); 
      }
    };
    
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [query, token, musicService]);

  const openPicker = (item: SearchItem) => {
    if (item.type !== 'track') return;
    setSelectedTrack(item);
    setPlaylistModal(true);
  };

  const addTrackToPlaylist = async (plId: string) => {
    if (!selectedTrack || selectedTrack.type !== 'track') return;
    const plRef = ref(database, `playlists/${plId}`);
    const plSnap = await get(plRef);
    if (!plSnap.exists()) return;
    
    const playlist = plSnap.val();
    
    // Check if the song already exists in the playlist
    if (playlist.songs?.some((s: Song) => 
      s.spotify_id === selectedTrack.id || 
      (musicService === 'AppleMusic' && s.apple_music_id === selectedTrack.id)
    )) {
      console.log('Song already exists in playlist');
      setPlaylistModal(false);
      return;
    }
    
    // Create song object based on the music service, but using the same structure
    const newSong: Song = {
      spotify_id: musicService === 'AppleMusic' ? '' : selectedTrack.id,
      apple_music_id: musicService === 'AppleMusic' ? selectedTrack.id : '',
      name: selectedTrack.name,
      artist: selectedTrack.artists?.map(a => a.name).join(', ') || '',
      spotify_uri: musicService === 'AppleMusic' ? '' : (selectedTrack.uri || ''),
      apple_music_uri: musicService === 'AppleMusic' ? (selectedTrack.uri || '') : '',
      duration_ms: selectedTrack.duration_ms || 0,
      cover_art: selectedTrack.album?.images[0]?.url || selectedTrack.images?.[0]?.url || '',
      album: selectedTrack.album?.name || '',
    };
    
    // Add the song to the playlist's songs array
    const songs = playlist.songs || [];
    const updatedSongs = [...songs, newSong];
    await set(ref(database, `playlists/${plId}/songs`), updatedSongs);
    
    setPlaylistModal(false);
    setSelectedTrack(null);
    setSuccessModal(true);
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

  // Successful Add Timed Popup
  useEffect(() => {
    if (successModal) {
      const timer = setTimeout(() => {
        setSuccessModal(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [successModal]);

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
                  ) :
                    item.type === 'album' ? (
                      <IconButton
                        icon="arrow-right"
                        size={25}
                        onPress={() => router.push({ pathname: '/album', params: { id: item.id } })}
                        style={styles.addIcon}
                        iconColor="white"
                      />
                    ) :
                    item.type === 'artist' ? (
                      <IconButton
                        icon="arrow-right"
                        size={25}
                        onPress={() => router.push({ pathname: '/artist', params: { id: item.id } })}
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

        {/* Successful adding */}
        <Modal visible={successModal} transparent onRequestClose={() => setSuccessModal(false)}>
          <View style={styles.modalWrap}>
            <View style={styles.modalBoxSuccess}>
              <IconButton
                icon='check'
                size={60}
                iconColor='black'
              />
              <Text variant="titleLarge">Successfully Added!</Text>
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
  modalBoxSuccess: {
    backgroundColor: 'white',
    opacity: 0.7,
    padding: 15,
    borderRadius: 8,
    width: '85%',
    alignItems: 'center',
    flexDirection: 'row'
  },
});
