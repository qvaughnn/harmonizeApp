import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, Modal, ScrollView, FlatList } from 'react-native';
import { Searchbar, List, IconButton, Button, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ref, onValue, set, push, get } from 'firebase/database';
import { database } from './config/firebase';
import { Playlist, PlaylistPreview, Song, UserRef } from '@/types';

type SpotifyTrack = {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { 
      name: string;
      images: { url: string }[] 
    };
    uri: string;
    duration_ms: number;
  };

export default function Album() {
    const { id } = useLocalSearchParams();
    const { token, currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [album, setAlbum] = useState<any>(null);
    const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
    const [playlistModal, setPlaylistModal] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState<PlaylistPreview[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
    // new playlist modal
    const [newModal, setNewModal] = useState(false);
    const [newName, setNewName] = useState('');
    const placeholderCover = require('../assets/images/coverSample.png');
    const router = useRouter();
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
    console.log('Album Page Playlists unmounted');
  }
}, []);

    useEffect(() => {
        const fetchAlbum = async () => {
            if (!id) return;
            try{
        const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAlbum(data);
        setTracks(data.tracks.items);
        } catch (error) {
            console.error('Error fetching album:', error);
        } finally {
            setLoading(false);
        }
    }; 
    fetchAlbum();
    }, [id, token]);

    const addTrackToPlaylist = async (plId: string) => {
        if (!selectedTrack) return;
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
          cover_art: album?.images?.[0]?.url || 'placeholderCover',
          album: album?.name || '',
        };
        const updated = [...(plSnap.songs || []), newSong];
        await set(ref(database, `playlists/${plId}/songs`), updated);
        setPlaylistModal(false);
        setSelectedTrack(null);
      };

      const openPicker = (item: SpotifyTrack) => {
        setSelectedTrack(item);
        setPlaylistModal(true);
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
        <ThemedView style={styles.overall}>
            <ScrollView style={styles.scrollContainer}>
                {album && (
                    <View style={styles.header}>
                      <View style={styles.headerRow}>
                        <IconButton
                            icon="arrow-left"
                            size={30}
                            style={styles.backButton}
                            iconColor="grey"
                            onPress={() => router.back()}
                        />
                      <Text style={styles.albumTitle}>{album.name}</Text>
                    </View>
                    <Image source={{ uri: album.images[0]?.url }} style={styles.cover} />
                    <Text style={styles.artist}>{album.artists.map((a: any) => a.name).join(', ')}</Text>
                  </View>
                )}

                <View>
                    {tracks.map((track) => (
                    <List.Item
                        key={track.id}
                        title={track.name}
                        description={track.artists.map(a => a.name).join(', ')}
                        titleStyle={styles.trackTitle}
                        descriptionStyle={styles.trackDesc}
                        right={props => (
                            <IconButton
                                {...props}
                                icon="plus-circle-outline"
                                size={24}
                                style={styles.addIcon}
                                iconColor="white"
                                onPress={() => {
                                    // Handle add song to playlist
                                    console.log(`Adding track: ${track.name}`); 
                                    openPicker(track)
                                }}

                            />
                        )}
                    />
                    ))}
                </View>
            </ScrollView>

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
        );
        }
        
    const styles = StyleSheet.create({
            overall: {
                flex: 1,
                alignItems: 'center',
                paddingTop: 60,
                justifyContent: 'flex-start',
              },
              scrollContainer: {
                paddingHorizontal: 20,
                paddingBottom:40,
                width: '100%',
              },
              header: {
                alignItems: 'center',
                marginVertical: 30,
              },
              cover: {
                width: 200,
                height: 200,
                borderRadius: 8,
              },
              albumTitle: {
                fontWeight: 'bold',
                color: 'white',
                fontSize: 35,
                alignItems: 'center',
                justifyContent: 'center',
                width: '80%'
              },
              artist: {
                color: '#DADADA',
                marginTop: 4,
                textAlign: 'center',
              },
              trackTitle: {
                color: 'white',
              },
              trackDesc: {
                color: '#DADADA',
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
              thumbnail: {
                width: 50,
                height: 50,
                borderRadius: 4,
              },
              input: {
                marginVertical: 12,
              },
              headerContainer: {
                flexDirection: 'row',
              },
              backButton: {
                // marginLeft: 10,
              },
              headerRow: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
                marginBottom: 20,
              },

});
