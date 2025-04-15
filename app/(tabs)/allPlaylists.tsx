import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, Searchbar, List, Button, IconButton, Modal, TextInput } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlatList } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { app, database } from "../config/firebase";
import { ref, set, onValue, get, child, push, DatabaseReference, query, orderByChild, equalTo, DataSnapshot } from "firebase/database";

type SpotifyItem = {
  id: string;
  name: string;
  images?: { url: string }[];
  uri: string | number;
};

const AllPlaylists = () => {
  const { token } = useAuth(); 
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SpotifyItem[]>([]);
  const [filteredResults, setFilteredResults] = useState<SpotifyItem[]>([]);

  
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

  // creates a new playlist with the given name, author, and image and returns the key of the new playlist
async function createPlaylist(name: string, author: string, image: string): Promise<string | null> {
  const playlistsRef = ref(database, "playlists");

  // generates unique id for playlist
  const newPlaylistRef = push(playlistsRef);

  const playlistData = {
    name: name,
    author: author,
    image: image,
    // can add more fields later
  }

  // Set the playlist data at the new location
  set(newPlaylistRef, playlistData)
    .then(() => {
      console.log("Playlist added successfully with ID: ", newPlaylistRef.key);
    })
    .catch((error) => {
      console.error("Error adding playlist: ", error);
    });

  return newPlaylistRef.key;
}

  useEffect(() => {
    if (token) {
      fetchPlaylists();
    }
  }, [token]);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
  
      const data = await response.json();
  
      if (response.ok) {
        const playlistsData = data.items || [];
        const fetchedPlaylists = playlistsData.map((playlist: any) => {
          if (playlist.name && playlist.images && playlist.images.length > 0) {
            return {
              id: playlist.id,
              name: playlist.name,
              uri: playlist.images[0].url,
            };
          } else {
            return {
              id: playlist.id,
              name: playlist.name,
              uri: require('../../assets/images/coverSample.png'),
            };
          }
        });
        setResults(fetchedPlaylists);
        setFilteredResults(fetchedPlaylists);
      } else {
        console.error("Error fetching playlists:", data);
      }
    } catch (error) {
      console.error("Playlists fetch error:", error);
    }
  };

  const addPlaylist = () => {
    setVisible(false);
    createPlaylist(text, "playlistID", "../assets/images/coverSample.png");

  };

  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  const showPopup = () => setVisible(true);
  const hidePopup = () => setVisible(false);

   const [playlistName, setPlaylistName] = React.useState('');

  const closeNewPlaylistModal = () => {
    setVisible(false);
    setPlaylistName(''); // Reset the input field
  };

  const addNewPlaylist = () => {
    console.log("Creating new playlist with name: ", playlistName);
    // You can handle the logic to create the playlist here
    createPlaylist(playlistName, "authorID", "imageURL");
    closeNewPlaylistModal(); // Close the modal after creating the playlist
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <FlatList 
          data={filteredResults} 
          keyExtractor={(item: SpotifyItem) => item.id}
          renderItem={({ item }: { item: SpotifyItem }) => (
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
                item.uri ? (
                  <Image 
                    source={typeof item.uri === 'string' ? { uri: item.uri } : (item.uri as number)} 
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
        <Button onPress={addNewPlaylist} style={styles.newPlaylistButton} labelStyle={{ color: 'black' }}>Create</Button>
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
  left:25
 },
 arrowIcon: {
  width: 24,
  height: 24,
  right:10
 },
 name:{
  left: 20,
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
