import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, IconButton, Modal, Searchbar, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { database } from './config/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import { Playlist, Song, UserRef } from '@/types';

// Local type for Spotify track search results
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

export default function PlaylistScreen() {
  const router = useRouter();
  const { currentUser, token } = useAuth();
  const { id: playlistId } = useLocalSearchParams();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Search modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);

  
  // Load Playlist from Firebase
  useEffect(() => {
    if (!playlistId) return;
    const playlistRef = ref(database, `playlists/${playlistId}`);
    const unsubscribe = onValue(
      playlistRef,
      (snapshot) => {
        const data = snapshot.val();
        setPlaylist(data ? (data as Playlist) : null);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading playlist:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [playlistId]);

  // Fetch Spotify tracks for search
  useEffect(() => {
    const fetchTracks = async () => {
      if (!token || searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (res.ok && data.tracks?.items) {
          setSearchResults(
            data.tracks.items.map((t: any) => ({
              id: t.id,
              name: t.name,
              artists: t.artists,
              album: t.album,
              uri: t.uri,
              duration_ms: t.duration_ms,
            }))
          );
        } else {
          console.error('Search error:', data);
        }
      } catch (e) {
        console.error('Search fetch error:', e);
      } finally {
        setSearchLoading(false);
      }
    };
    const timeout = setTimeout(fetchTracks, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, token]);

  // Add selected track to playlist
  const selectTrack = async (track: SpotifyTrack) => {
    if (!playlistId || !currentUser || !playlist) return;

    const isDuplicate = playlist.songs?.some(s => s.spotify_id === track.id);
    if (isDuplicate) {
      console.log('Song already exists in playlist');
      return;
    }

    const newSong: Song = {
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name ?? '',
      duration_ms: track.duration_ms,
      cover_art: track.album.images[0]?.url ?? '',
      spotify_id: track.id,
      spotify_uri: track.uri,
    };

    const updatedSongs = [...(playlist.songs || []), newSong];

    await set(ref(database, `playlists/${playlistId}/songs`), updatedSongs);
    setModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // const renderTrackItem = ({ item }: { item: any }) => {
  //   const track = item.track;
  //   if (!track) return null;

  //   return (
  //     <View style={styles.trackItem}>
  //       <Image
  //         source={{ uri: track.album.images?.[0]?.url }}
  //         style={styles.trackImage}
  //       />
  //       <View style={styles.trackInfo}>
  //         <Text style={styles.trackName}>{track.name}</Text>
  //         <Text style={styles.trackArtist}>
  //           {track.artists?.map((artist: any) => artist.name).join(', ')}
  //         </Text>
  //       </View>
  //     </View>
  //   );
  // };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
      </ThemedView>
    );
  }

  if (!playlist) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Text>Playlist not found.</Text>
      </ThemedView>
    );
  }

  const toggleExport = () => {

  }

  return (
    <ThemedView style={styles.overall}>
      <FlatList
        data={playlist.songs}
        keyExtractor={(item, index) => `${item.spotify_id}_${index}`}
        contentContainerStyle={styles.trackList}
        ListHeaderComponent={(
        <View>
          
          <View style={styles.headerContainer}>
            <IconButton
              icon="arrow-left"
              size={30}
              onPress={() => router.back()}
              style={styles.backButton}
              iconColor="grey"
            />
            <Text style={styles.playlistTitle}>
              {playlist.name}
            </Text>
          </View>

          <View style={styles.coverContainer}>
            {playlist.cover_art && (
              <Image
                source={
                  typeof playlist.cover_art === 'string'
                    ? { uri: playlist.cover_art }
                    : playlist.cover_art
                }
                style={styles.coverImage}
              />
            )}
            <View>
              <Text style={styles.owner}>
                Owner: { (playlist.owner as UserRef).name }
                {/* Harmonizers: {playlist.owner?.display_name || 'Unknown'} */}
              </Text>
              {playlist.description ? (
                <Text style={styles.description}>{playlist.description}</Text>
              ) : null} 

            <Pressable onPress={() => setExportVisible(true)}>
              <Text style={styles.export}>Export</Text>
            </Pressable>
            </View>
          </View>
        </View>
          
        )}
            renderItem={({ item }) => (
              <View style={styles.trackItem}>
                {item.cover_art ? (
                  <Image source={{ uri: item.cover_art }} style={styles.trackImage} />
                ) : null}
                <View style={styles.trackInfo}>
                  <Text style={styles.trackName}>{item.name}</Text>
                  <Text style={styles.trackArtist}>{item.artist}</Text>
                </View>
              </View>
            )}
          />
      {/* Export Modal */}
      <Modal visible={exportVisible} onDismiss={() => setExportVisible(false)}>
        <View style={styles.exportContent}>
          <Pressable>
            <Text style={styles.exportText}>
              Export to Spotify
            </Text>
          </Pressable>
          <Pressable>
            <Text style={styles.exportText}>
              Export to Apple Music
            </Text>
          </Pressable>
          <Pressable onPress={() => setExportVisible(false)}>
            <Text style={styles.exportClose}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </Modal>

      {/*Potential Edit Playlist Button (Options to remove song etc))}
      {/* <IconButton
        icon="pencil-circle"
        size={40}
        onPress={showPopup}
        style={styles.editIcon}
        iconColor="black"
      /> */}
      {/* Add Song Button */}
      <IconButton
        icon="plus-circle-outline"
        size={40}
        style={styles.addIcon}
        onPress={() => setModalVisible(true)}
        iconColor='black'
      />
      {/* Search & Add Modal */}
      <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)}>
        <View style={styles.modalContent}>
          <Searchbar
            placeholder="Search Spotify tracks"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchbar}
          />
          <IconButton
            icon="close"
            size={30}
            onPress={() => setModalVisible(false)}
            style={styles.closeinbar}
          />
          {searchLoading ? (
            <ActivityIndicator animating size="small" />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={t => t.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <List.Item
                  title={item.name}
                  description={item.artists.map(a => a.name).join(', ')}
                  left={() => (
                    <Image source={{ uri: item.album.images[0]?.url }} style={styles.thumbnail} />
                  )}
                  onPress={() => selectTrack(item)}
                />
              )}
            />
          )}
          
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overall: {
    flex: 1,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
  },
  backButton: {
    // marginLeft: 10,
  },
  playlistTitle: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 35,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%'
  },
  coverContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  coverImage: {
    width: 220,
    height: 220,
    borderRadius: 5,
    marginVertical: 12,
    resizeMode: 'cover'
  },
  owner: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  description: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'regular',
    marginBottom: 20,
  },
  export: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'regular',
    marginBottom: 20,
  },
  trackList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  trackArtist: {
    color: 'grey',
    fontSize: 14,
  },
  editIcon: {
    right: 10,
    bottom: 75,
    position: 'absolute',
    justifyContent: 'flex-start',
  },
   addIcon: { 
    position: 'absolute', 
    right: 20, 
    bottom: 40
  },
   modalContent: { 
    backgroundColor: 'white', 
    padding: 30,
    margin: 20, 
    borderRadius: 8,
    height: '80%',
    top: 70
  },
   searchbar: { 
    marginBottom: 10,
    width: '90%'
  },
  closeinbar: {
    top: -63,
    left: 285
  },
   thumbnail: { 
    width: 40, 
    height: 40, 
    borderRadius: 4, 
    marginRight: 8 
  },
  exportText: {
    fontSize: 20,
    marginBottom: 20
  },
  exportClose: {
    fontSize: 15,
    marginBottom: 20
  },
  exportContent: { 
    backgroundColor: 'white', 
    padding: 20,
    margin: 10,
    borderRadius: 8,
    height: '55%',
    width: '70%',
    top: 70,
    alignSelf: 'center',
  },
});
