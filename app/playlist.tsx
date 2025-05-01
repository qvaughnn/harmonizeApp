import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Image, FlatList, Pressable, Modal, Animated } from 'react-native';
import { Text, ActivityIndicator, IconButton, Searchbar, List, Icon } from 'react-native-paper';
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

// Local type for friends
type User = {
  id: string;
  picture: string;
}

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

  // Confirm remove song modal state
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [selectedSongToRemove, setSelectedSongToRemove] = useState<Song | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);

  // Successful Adding Modal
  const [successModal, setSuccessModal] = useState(false);

  // Adding Collaborators
  const [addCollab, setAddCollab] = useState(false);
  const [friendsResults, setFriendsResults] = useState<User[]>([]);

  // Pin playlist name when scrolling
  const scrollY = useRef(new Animated.Value(0)).current;

  const titleFontSize = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [35, 20],
    extrapolate: 'clamp',
  });

  const titleTopOffset = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [40, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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

    const isDuplicate = playlist.songs?.some((s: Song) => s.spotify_id === track.id);
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
    setSuccessModal(true);
  };

  const removeSong = async (songToRemove: Song) => {
    if (!playlistId || !currentUser || !playlist) return;

    const updatedSongs = playlist.songs?.filter((s: Song) => s.spotify_id !== songToRemove.spotify_id);
    await set(ref(database, `playlists/${playlistId}/songs`), updatedSongs);
    setConfirmRemoveVisible(false);
  }

  // Successful Add Timed Popup
  useEffect(() => {
    if (successModal) {
      const timer = setTimeout(() => {
        setSuccessModal(false);
      }, 500);
    }
  })

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

  return (
    <ThemedView style={styles.overall}>

    <Animated.View
      style={[
        styles.floatingTitleContainer,
        {
          transform: [{ translateY: titleTopOffset }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.floatingTitleBackground,
          { opacity: headerBackgroundOpacity },
        ]}
      />
      <Animated.Text style={[styles.floatingTitleText, { fontSize: titleFontSize }]}>
        {playlist.name}
      </Animated.Text>
    </Animated.View>

      <Animated.FlatList
        data={playlist.songs}
        keyExtractor={(item, index) => `${item.spotify_id}_${index}`}
        contentContainerStyle={styles.trackList}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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

          <View style={styles.exportEditContainer}>
            {/* <Pressable onPress={() => router.push('/friends')}> */}
              {/* <Text style={styles.export}>Export</Text> */}
              <IconButton
                icon="export-variant"
                size={28}
                onPress={()=>setExportVisible(true)}
                iconColor="white"
              />
            {/* </Pressable> */}

            {/* Add Collaborator Button */}
            <IconButton
            icon="account-multiple-plus"
            size={28}
            onPress={() => {
              // Open add collaborator modal or screen
              console.log('Add collaborator pressed')
              setAddCollab(true)
            }}
            iconColor="white"
          />

            {/* <Pressable onPress={() => setEditMode(prev => !prev)}> */}
              {/* <Text style={styles.edit}>{editMode ? 'Done' : 'Edit'}</Text> */}
              <IconButton
                icon ="pencil"
                onPress = { () => {
                  setEditMode(prev => !prev);
                  
                } }
                size={28}
                iconColor="white"
              />
            {/* </Pressable> */}
            </View>
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
                {editMode && (
                <IconButton
                  icon="minus-circle"
                  size={24}
                  onPress={() => {
                    setSelectedSongToRemove(item);
                    setConfirmRemoveVisible(true);
                  }}
                  iconColor="white"
                />
                )}
              </View>
            )}
          />
     {/* Export Modal */}
     <Modal 
      visible={exportVisible}
      transparent = {true}
      animationType='fade'
      onDismiss={() => setExportVisible(false)}>
      <View style={styles.exportWrap}>
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
        <View style={ {marginTop: 10, alignItems: 'center'} }>
         <Pressable onPress={() => setExportVisible(false)}>
           <Text style={styles.exportClose}>
             Cancel
           </Text>
         </Pressable>
        </View>
       </View>
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
      {/* Add Song Button that is only visible when edit button is not active*/}
      {!editMode && (<IconButton
        icon="plus-circle-outline"
        size={40}
        style={styles.addIcon}
        onPress={() => setModalVisible(true)}
        iconColor='white'
      />)
      }

      {/* Done Button that is only visible when edit button is active to end edit mode */}
      {editMode && (<IconButton
        icon="check-circle"
        size={40}
        style={styles.addIcon}
        onPress={() => setEditMode(prev => !prev)}
        iconColor='white'
      />)
      }


      {/* Search & Add Modal */}
      <Modal visible={modalVisible} transparent onDismiss={() => setModalVisible(false)}>
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

      {/* Remove song from playlist popup */}
      <Modal visible={confirmRemoveVisible} transparent onDismiss={() => setConfirmRemoveVisible(false)}>
        <ThemedView style={styles.confirmModal}>
          <Text style={styles.confirmText}>
            Are you sure you want to remove{' '}
            <Text style={{ fontWeight: 'bold', color:'white'}}>{selectedSongToRemove?.name}</Text>?
          </Text>
          <View style={styles.buttonContainer}>
            <Pressable style={styles.confirmButton} onPress={() => selectedSongToRemove && removeSong(selectedSongToRemove)}>
               <Text style={styles.confirmButtonText}>Yes</Text> 
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setConfirmRemoveVisible(false)}>
               <Text style={styles.cancelButtonText}>Cancel</Text> 
            </Pressable>
          </View>
        </ThemedView>
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

    {/* Search and Add for friends Modal */}
    <Modal visible={addCollab} transparent onDismiss={() => setAddCollab(false)}>
        <View style={styles.modalContent}>
          <Searchbar
            placeholder="Search for Harmonizers"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchbar}
          />
          <IconButton
            icon="close"
            size={30}
            onPress={() => setAddCollab(false)}
            style={styles.closeinbar}
          />
          {searchLoading ? (
            <ActivityIndicator animating size="small" />
          ) : (
            <FlatList
              data={friendsResults}
              keyExtractor={t => t.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <List.Item
                  title={item.id}
                  left={() => (
                    <Image source={ require('../assets/images/avatar.png') } style={styles.thumbnail} />
                  )}
                  onPress={() => router.push(`/friendProfile?id=${item.id}`)}
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
    textAlign: 'center',
  },
  description: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  export: {
    color: 'white',
    fontSize: 16,
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
    marginBottom: -40,
    width: '90%'
  },
  closeinbar: {
    top: -15,
    left: 285
  },
   thumbnail: { 
    width: 40, 
    height: 40, 
    borderRadius: 4, 
    marginRight: 8 
  },
  confirmModal: {
    padding: 30,
    margin: 40,
    borderRadius: 10,
    top: 300,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: 'white',
  },
  buttonContainer:{
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginTop: 10,
  },
  confirmButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 25,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 25,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'black',
    fontSize: 16,
  },
  
  cancelButtonText: {
    color: 'black',
    fontSize: 16,
  },
  exportEditContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  edit: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'regular',
    marginLeft: 20,
  },
  exportWrap: {
    position: 'absolute',
    top: 400, // or wherever you want it to appear
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  exportContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    elevation: 5, // for shadow on Android
    shadowColor: '#000', // for shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exportText: {
    fontSize: 20,
    marginBottom: 20
  },
  exportClose: {
    fontSize: 15,
    marginBottom: 20,
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
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '85%',
  },
  floatingTitleContainer: {
    position: 'absolute',
    top: 0, // goes behind status bar
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'flex-end', // push text downward
    height: 110, // or whatever height gives you room to breathe
    pointerEvents: 'none', // lets you interact with stuff behind it
  },
  floatingTitleText: {
    color: 'white',
    fontWeight: 'bold',
    paddingTop: 40, // adds space below status bar
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  floatingTitleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(150, 144, 144, 0.8)', // semi-transparent black
  },
});
