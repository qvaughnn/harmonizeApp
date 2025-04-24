import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, Searchbar, List, Button, IconButton, Modal, TextInput } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { GestureHandlerRootView, FlatList } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { database } from '../config/firebase';
import { ref, set, get, onValue, push } from 'firebase/database';
import { PlaylistPreview, Playlist, UserRef, Song } from '@/types';

const defaultCover = require('../../assets/images/coverSample.png');

const AllPlaylists = () => {
  const { currentUser } = useAuth(); 
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PlaylistPreview[]>([]);
  const [filteredResults, setFilteredResults] = useState<PlaylistPreview[]>([]);

    // Fetch playlists the user has access to from Firebase
    useEffect(() => {
      if (!currentUser?.id) return;
      const userPlaylistsRef = ref(database, `users/${currentUser.id}/userPlaylists`);
      const unsubscribe = onValue(
        userPlaylistsRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const ids: string[] = Object.keys(snapshot.val() || {});
            const promises = ids.map((id) =>
              get(ref(database, `playlists/${id}`)).then((snap) => (snap.exists() ? snap.val() : null))
            );
            const playlistsData = (await Promise.all(promises)).filter((p) => p);
            const previews: PlaylistPreview[] = playlistsData.map((p: any) => ({
              id: p.id,
              name: p.name,
              cover_art: p.cover_art,
            }));
            setResults(previews);
            setFilteredResults(previews);
          } else {
            setResults([]);
            setFilteredResults([]);
          }
        },
        (error) => {
          console.error('Error fetching user playlists:', error);
        }
      );
      return () => unsubscribe();
    }, [currentUser]);

  // Handle search filtering
  function handleSearchQueryChange(query: string): void {
    setSearchQuery(query);

    if (query.trim()=== ''){
      setFilteredResults(results);
    } else{
      setFilteredResults(
        results.filter((playlist) =>
          playlist.name.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
  }

  // Create a new playlist in Firebase and add reference under user tree
  const createPlaylist = async (name: string) => {
    if (!currentUser?.id) return;
    const playlistsRef = ref(database, 'playlists');
    const newRef = push(playlistsRef);
    const id = newRef.key as string;

    // Build full Playlist data
    const playlistData: Playlist = {
      id,
      name,
      description: '',
      cover_art: defaultCover,
      owner: currentUser as UserRef,
      harmonizers: [currentUser as UserRef],
      og_platform: 'harmonize',
      songs: [] as Song[], // start with no songs
    };

    // Save full playlist under /playlists/{id}
    await set(newRef, playlistData);
    // Reference it under the user for quick lookup
    await set(ref(database, `users/${currentUser.id}/userPlaylists/${id}`), true);

    // Update local previews
    const newPreview: PlaylistPreview = { id, name, cover_art: defaultCover };
    setResults((prev) => [newPreview, ...prev]);
    setFilteredResults((prev) => [newPreview, ...prev]);
  };

  // Modal State
  const [visible, setVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const showPopup = () => setVisible(true);
  const hidePopup = () => setVisible(false);

  const closeNewPlaylistModal = () => {
    hidePopup();
    setPlaylistName('');
  };

  const addPlaylist = () => {
    hidePopup();
    createPlaylist(playlistName.trim());
    setPlaylistName('');
  };


  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        PLAYLISTS
      </Text>
      <IconButton
        icon="plus-circle-outline"
        size={40}
        onPress={showPopup}
        style={styles.addIcon}
        iconColor="grey"
      />
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search Playlists"
          value={searchQuery}
          onChangeText={handleSearchQueryChange}
          style={styles.searchbar}
        />
      </View>
      <GestureHandlerRootView style={{ flex: 1 , width: '100%'}}>
        <FlatList 
          data={filteredResults} 
          keyExtractor={(item: PlaylistPreview) => item.id}
          renderItem={({ item }: { item: PlaylistPreview }) => (
            <List.Item
              // Navigate to the playlist page when pressed, passing the id
              onPress={() => router.push(`/playlist?id=${item.id}`)}
              // Use a custom title component to truncate long titles
              title={() => (
                <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                  {item.name}
                </Text>
              )}
              left={() =>
                item.cover_art ? (
                  <Image 
                    source={typeof item.cover_art === 'string' ? { uri: item.cover_art } : item.cover_art} 
                    style={styles.thumbnail} 
                  />
                ) : (
                  <List.Icon icon="music" />
                )
              }
              right={() => (
                <View style={styles.rightContainer}>
                  <IconButton
                  icon="arrow-right-circle-outline"
                  size={25}
                  style={styles.arrowIcon}
                  iconColor='white'
                  />
                </View>
              )}
            />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </GestureHandlerRootView>

      <Modal 
        visible={visible} 
        onDismiss={hidePopup} 
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.innerContainer}>
          <ThemedView style={styles.modalContent}>
            <Text variant="headlineMedium" style={styles.addTitle}>Playlist Name</Text>
        <TextInput
              label="Enter Playlist Name"
              mode="outlined"
              value={playlistName}
              onChangeText={setPlaylistName}
              style={styles.playlistInput}
        />
        <Button onPress={addPlaylist} style={styles.newPlaylistButton} labelStyle={{ color: 'black' }}>Create</Button>
        <Button onPress={closeNewPlaylistModal} labelStyle={{ color:'white'}}>Cancel</Button>
          </ThemedView>
        </View>
      </Modal>

    </ThemedView>
  );
};

export default AllPlaylists;

const styles = StyleSheet.create({
 overall: {
   alignItems: 'center',
   flex:1,
   paddingTop: 60,
   justifyContent: 'flex-start'
 },
 title:{
   fontWeight: 'bold',
   color: 'darkgrey',
   position: 'absolute',
   top: 80,
   left: 25,
   justifyContent: 'flex-start',
 },
 searchContainer:{
   marginTop:100,
   width: '90%'
 },
 searchbar: {
   width: '100%',
   marginBottom: 30,
 },
 rightContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
 },
 thumbnail: {
  width: 80,
  height: 80,
  borderRadius: 4,
  marginLeft: 40
 },
 arrowIcon: {
  width: 24,
  height: 24,
  marginRight: 25
 },
 name:{
  left: 5,
  color: 'white',
  width: '87%',
  fontSize: 18,
  fontWeight: "bold"
 },
 addIcon: {
  right: 10,
  top: 75,
  position: 'absolute',
  justifyContent: 'flex-start',
 },
 popup: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
 },
 modalContent: {
  width: '100%',
  height: '100%',
  backgroundColor: 'transparent',
  padding: 20,
  borderRadius: 10,
  alignItems: 'center',
  // borderWidth: 2,  // Adds a border
  // borderColor: 'black',  // Sets the border color
 },
 modalContainer: {
  backgroundColor: 'transparent',
  padding: 10,
  width: 300, // Explicit width
  height: 300,
  alignSelf: 'center',
  borderRadius: 10,
 },
 innerContainer: {
  justifyContent: 'center',
  color: 'grey',
  height: 270,
 },
modalText: {
  fontSize: 18,
  marginBottom: 10,
  color: 'white',
 },
 input: {
  width: '100%', // Ensures the input expands
  marginBottom: 20,
 },
 button: {
  alignSelf: 'center',
  width: '80%', // Optional, to match input width
 },
 newPlaylistButton: {
  backgroundColor: 'white',
  marginBottom: 10,
  width: '50%',
  paddingVertical: 10,
  borderRadius: 30,
  height: 60,
},
playlistInput: {
  width: '80%',
  marginBottom: 20,
},
addTitle: {
  color: 'white',
  fontSize: 20,
  marginBottom: 20,
},
playlistModalContent: {
  backgroundColor: 'black',
  padding: 20,
  borderRadius: 10,
  alignItems: 'center',
  width: '80%',
  maxWidth: 400,
},
});
