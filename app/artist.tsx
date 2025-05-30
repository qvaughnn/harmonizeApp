import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, Modal, ScrollView, FlatList } from 'react-native';
import { Searchbar, List, IconButton, Button, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ref, onValue, set, push, get } from 'firebase/database';
import { database, fireDB } from './config/firebase';
import { Playlist, PlaylistPreview, Song, UserRef } from '@/types';
import { useMusicService } from '../contexts/MusicServiceContext';
import { collection, getDocs } from "firebase/firestore";

type Album = {
    id: string;
    name: string;
    release_date: string;
    images: { url: string }[];
};

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


export default function Artist() {
    const { id } = useLocalSearchParams();
    const { token, currentUser } = useAuth();
    const [artist, setArtist] = useState<any>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [topTracks, setTopTracks] = useState<any>(null);
    const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
    const [playlistModal, setPlaylistModal] = useState(false);
    const { musicService } = useMusicService();


    const getFirestore = async () => {
    const querySnapshot = await getDocs(collection(fireDB, "privKey"));
    for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (data.devToken) {
            return data.devToken;
        }
    }
    return null;
    };

    const [newName, setNewName] = useState('');
    const placeholderCover = require('../assets/images/coverSample.png');
    const [newModal, setNewModal] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState<PlaylistPreview[]>([]);

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
        // const list: PlaylistPreview[] = [];
        // for (const id of ids) {
        //   const data = await new Promise<any>((resolve) => onValue(ref(database, `playlists/${id}`), s => resolve(s.val()), { onlyOnce: true }));
        //   if (data) list.push({ id: data.id, name: data.name, cover_art: data.cover_art || placeholderCover });
        // }
        // setUserPlaylists(list);
        });
        return () => {
        unsub();
        console.log('Search Page Playlists unmounted');
        }
    }, []);


    useEffect(() => {
        const fetchArtist = async () => {
            if (!id || (!token && !currentUser.uToken)) return;
            try {
                console.log("UseEffect activated");
                if(musicService === 'Spotify'){
                const artistRes = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const artistData = await artistRes.json();
                setArtist(artistData);

                const albumsRes = await fetch(`https://api.spotify.com/v1/artists/${id}/albums`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const albumsData = await albumsRes.json();
                setAlbums(albumsData.items);

                const topTracksRes = await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const topTracksData = await topTracksRes.json();
                setTopTracks(topTracksData.tracks);
                } else { //Apple logic
                const devToken = await getFirestore();
                const userToken = currentUser?.uToken;

                const artistRes = await fetch(`https://api.music.apple.com/v1/catalog/us/artists/${id}`, {
                    headers: {
                        Authorization: `Bearer ${devToken}`,
                        'Music-User-Token': userToken,
                    },
                });
                const artistData = await artistRes.json();
                setArtist(artistData.data[0]);

                const topTracksRes = await fetch(`https://api.music.apple.com/v1/catalog/us/artists/${id}/view/top-songs`, {
                    headers: {
                        Authorization: `Bearer ${devToken}`,
                        'Music-User-Token': userToken,
                    },
                });
                const topTracksData = await topTracksRes.json();
                setTopTracks(topTracksData.data || []);

                const albumsRes = await fetch(`https://api.music.apple.com/v1/catalog/us/artists/${id}/albums`, {
                    headers: {
                        Authorization: `Bearer ${devToken}`,
                        'Music-User-Token': userToken,
                    },
                });
                const albumsData = await albumsRes.json();
                setAlbums(albumsData.data || []);
            }

            } catch (error) {
                console.error('Error fetching artist data:', error);
            } finally {
                setLoading(false);
            }
        }; fetchArtist();
    }, [id, token, musicService, currentUser]);

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
        //setSuccessModal(true);
    };

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
            cover_art: selectedTrack.album?.images?.[0]?.url || 'placeholderCover',
            album: selectedTrack.album?.name || '',
        };
        const updated = [...(plSnap.songs || []), newSong];
        await set(ref(database, `playlists/${plId}/songs`), updated);
        setPlaylistModal(false);
        setSelectedTrack(null);
        };
        
      


    if (loading) {
    return (
        <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
        </ThemedView>
    );
}



    return(
        <ThemedView style={styles.overall}>
            <ScrollView style = {styles.scrollContainer}>
                {artist && (
                    <View style = {styles.header}>
                        <View style={styles.headerRow}>
                            <IconButton
                                icon="arrow-left"
                                iconColor='grey'
                                size={30}
                                onPress={() => router.back()}
                            />
                            <Text style = {styles.artistName}>
                               {artist.attributes?.name ?? artist.name}
                            </Text>
                        </View>
                          {artist.attributes?.artwork?.url ? (
                             // Apple Music
                             <Image
                              source={{ uri: artist.attributes.artwork.url.replace('{w}x{h}', '400x400') }}
                              style={styles.artistImage}
                            />
                          ) : artist.images?.[0]?.url ? (
                             // Spotify
                             <Image
                              source={{ uri: artist.images[0].url }}
                              style={styles.artistImage}
                            />
                          ) : null}
                        </View>
                )}
                {/* displays the artists top tracks */}
                <Text style = {styles.albumContainer}>Popular Songs</Text>
                {topTracks?.slice(0, 3).map((track: any) => (
                   <List.Item
                        key={track.id}
                        title={track.attributes?.name ?? track.name}
                        titleStyle={{ color: 'white' }}
                        right={props => (
                             <IconButton
                                  {...props}
                                  icon="plus-circle-outline"
                                  size={24}
                                  style={styles.addIcon}
                                  iconColor="white"
                                  onPress={() => {
                                    console.log(`Adding track: ${track.attributes?.name ?? track.name}`);
                                    openPicker(track);
                                  }}
                              />
                        )}
                        left={() =>
                             track.attributes?.artwork?.url || track.album?.images?.[0]?.url ? (
                                 <Image
                                   source={{
                                     uri: track.attributes?.artwork?.url
                                        ? track.attributes.artwork.url.replace('{w}x{h}', '100x100')
                                        : track.album.images[0].url,
                                    }}
                                 style={styles.albumImage}
                                 />
                             ) : null
                         }
                   />
                ))}
 
                {/* displays all of the artists albums */}
                <Text style={styles.albumContainer}>Albums</Text>
                {albums.map((album) => {
                   const isAppleMusic = musicService === 'AppleMusic';
                   const albumName = isAppleMusic ? album.attributes?.name : album.name;
                   const albumImage = isAppleMusic
                      ? album.attributes?.artwork?.url?.replace('{w}x{h}', '100x100')
                      : album.images?.[0]?.url;
                   const releaseYear = isAppleMusic
                      ? album.attributes?.releaseDate?.slice(0, 4)
                      : album.release_date?.slice(0, 4);
                   const albumId = album.id;

                   return (
                      <List.Item
                         key={albumId}
                         title={albumName}
                         titleStyle={styles.albumTitle}
                         description={releaseYear}
                         descriptionStyle={{ color: 'white' }}
                         left={() =>
                           albumImage ? (
                             <Image
                                source={{ uri: albumImage }}
                                style={styles.albumImage}
                             />
                           ) : null
                         }
                         onPress={() => router.push({ pathname: '/album', params: { id: albumId } })}
                     />
                   );
                })}

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
    )
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
            marginBottom: 30,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            marginBottom: 20,
        },
        artistName: {
            fontWeight: 'bold',
            color: 'white',
            fontSize: 30,
            marginLeft: 10,
        },
        artistImage:{
            width: 200,
            height: 200,
            marginBottom: 10,
        },
        albumContainer:{
            fontWeight: 'bold',
            color: 'white',
            fontSize: 24,
            marginBottom: 10,
        },
        albumImage: {
            width: 50,
            height: 50,
            borderRadius: 4,
            marginRight: 10,
        },
        albumTitle:{
            fontWeight: 'bold',
            color: 'white',
            fontSize: 18,
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
    });
    
