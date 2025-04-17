import { Image, StyleSheet, Platform, View, ImageBackground, Pressable, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Searchbar, List, IconButton } from 'react-native-paper';
import * as React from 'react';
import { useEffect, useState } from 'react';

import { FlatList } from 'react-native-gesture-handler';
import { getAuth, signInAnonymously } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { app, database } from "../config/firebase";
import { ref, set, onValue, get, child, push, DatabaseReference, query, orderByChild, equalTo, DataSnapshot } from "firebase/database";
import { userId } from '../index';

type SpotifyItem = {
  id: string;
  name: string;
  type: string;
  uri: string | number;
  artists?: { name: string }[];
  images?: { url: string }[];
  album?: {
    images: { url: string }[];
  };
  source: 'spotify' | 'firebase';
};


export default function TabTwoScreen() {
 const [searchQuery, setSearchQuery] = React.useState('');
 const [searchResults, setSearchResults] = React.useState<SpotifyItem[]>([]);
 const [loading, setLoading] = React.useState(false);
 const {token} = useAuth();
 const [modalVisible, setModalVisible] = React.useState(false);
 const[selectedSong, setSelectedSong] = React.useState<SpotifyItem | null>(null);
 const [newPlaylistModalVisible, setNewPlaylistModalVisible] = React.useState(false);
 const [playlistName, setPlaylistName] = React.useState('');
const [filteredResults, setFilteredResults] = useState<SpotifyItem[]>([]);
const [firebasePlaylists, setFirebasePlaylists] = useState<SpotifyItem[]>([]);

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

  console.log("reference key", newPlaylistRef.key);

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

// adds song to given playlist, only takes spotify id for now
async function addSong(playlistRef: string, spotifyId: string) {
  const songsRef = ref(database, `playlists/${playlistRef}/songs/spotify`)
  console.log("Playlist Ref: ", playlistRef);

  // generates unique id for song
  const newSongRef = push(songsRef);

  const songData = {
    spotifyId: spotifyId, 
    // can add more data if we want later
  }

  // Set the playlist data at the new location
  set(newSongRef, songData)
    .then(() => {
      console.log("Song added successfully with ID: ", newSongRef.key);
    })
    .catch((error) => {
      console.error("Error adding song: ", error);
    });
}

const fetchPlaylists = async (): Promise<SpotifyItem[]> => {
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
      return playlistsData.map((playlist: any) => ({
        id: playlist.id,
        name: playlist.name,
        uri: playlist.images?.[0]?.url || require('../../assets/images/coverSample.png'),
        source: 'spotify',
      }));
    } else {
      console.error("Error fetching Spotify playlists:", data);
      return [];
    }
  } catch (error) {
    console.error("Playlists fetch error:", error);
    return [];
  }
};

const fetchFirebasePlaylists = async (): Promise<SpotifyItem[]> => {
    return new Promise((resolve) => {
      if (!userId) {
        console.error("No userId set — cannot fetch playlists.");
        resolve([]);
        return;
      }
      const playlistsRef = query(ref(database, "playlists"), orderByChild("author"), equalTo(userId));

  
      onValue(playlistsRef, (snapshot) => {
        const data = snapshot.val();
        const firebasePlaylists: SpotifyItem[] = [];
  
        if (data) {
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            firebasePlaylists.push({
              id: key,
              name: value.name,
              uri: require('../../assets/images/coverSample.png'), // or load from Firebase if you store real URLs
              source: 'firebase',
              type: ''
            });
          });
        }
  
        resolve(firebasePlaylists);
      });
    });
  };


useEffect(() => {
  if (token) {
    Promise.all([fetchPlaylists(), fetchFirebasePlaylists()])
      .then(([spotifyResults, firebaseResults]) => {
        const combined = [...firebaseResults, ...spotifyResults];
        //setResults(combined);
        setFilteredResults(combined);
      })
      .catch((error) => {
        console.error("Error loading playlists:", error);
      });
  }
}, [token]);
 


 async function handleSearchQueryChange(query: string){
   setSearchQuery(query);

   if (query.length > 2) { //makes sure we have a long enough request
    if (!token) { //checks that we have authorization to request a search
      console.error("Token is missing!");
      return;
    }
    getResults(query);
  } else {
    setSearchResults([]); // Clear results
  }
}
 async function getResults(query: string) {
  try {
    setLoading(true);
    const response = await fetch(
      
      // `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=2`
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`, // Use the context token for request
          'Content-Type': 'application/json',
        },
      }
    );

    // Check if the response is OK (status code 200)
    if (!response.ok) {
      const errorText = await response.text(); // Read the raw response text
      console.error("Spotify Search Error: Non-200 Response", response.status, errorText);
      return;
    }

    // Attempt to parse JSON only if the response is successful
    const data = await response.json();

    if (data.error) {
      console.error("Spotify Search API Error:", data.error);
      return;
    }

    const results = [
      ...(data.tracks?.items || []),
      ...(data.artists?.items || []),
      ...(data.albums?.items || []),
    ];
    console.log(results);
    setSearchResults(results);
  } catch (error) {
    console.error("Error fetching Spotify search:", error);
  } finally {
    setLoading(false);
  }
}





  const closeModal = () => {
    setModalVisible(false);
    setSelectedSong(null);
  };

  const openNewPlaylistModal = () => {
    setModalVisible(false);
    setNewPlaylistModalVisible(true);
  };

  const closeNewPlaylistModal = () => {
    setNewPlaylistModalVisible(false);
    setPlaylistName(''); // Reset the input field
  };


  const addNewPlaylist = async() => {
    console.log("Creating new playlist with name: ", playlistName);
    try{
      if (userId !== null){
        const newKey = await createPlaylist(playlistName, userId, "imageURL");
        if (newKey !== null){
          await onPlaylistClicked(newKey);
        }
      }
    } catch(error){
      console.error("Error creating playlist:", error);   
    } finally {
      closeNewPlaylistModal(); // Close the modal after creating the playlist
    }  
  };
  const onPlaylistClicked = async (playlistKey: string) => {
    try{
      if (selectedSong && playlistKey){
        await addSong(playlistKey, selectedSong.id);
      } 
    } catch(error){
      console.error("Error adding song to playlist:", error);   
    } finally{
      setModalVisible(false);
      setSelectedSong(null);
    }
  };

    // handles adding a song to a playlist
    const handleAddSong = async (item: SpotifyItem) => {
      setSelectedSong(item);
      // try{
      //   const key = await createPlaylist(item.name, "authorID", "imageURL");
      //   console.log("Key: ", key);
      //   if (key !== null){
      //     await addSong(key, item.id);
      //   }
      // } catch(error){
      //   console.error("Error adding song to playlist:", error);   
      // }
      setModalVisible(true);
    };


 return (
   <ThemedView style={styles.overall}>
     <Text variant="displayMedium" style={styles.title}>
       SEARCH
     </Text>


    <View style = {styles.searchContainer}>
           <Searchbar
             placeholder="Search Songs, Albums, and Artists"
             value={searchQuery}
             onChangeText={handleSearchQueryChange}
             style={styles.searchbar}
           />
      </View>

      <GestureHandlerRootView style={{ flex: 1 }}>
        <FlatList 
          data={searchResults} 
          keyExtractor={(item: SpotifyItem) => item.id}
          renderItem={({ item}: { item: SpotifyItem }) => (
          <List.Item
          title={item.name}
          titleStyle={styles.name}
          description={
            item.type === 'artist'
              ? 'Artist'
              : item.type === 'album'
              ? `Album - ${item.artists?.map((artist) => artist.name).join(', ')}`
              : item.type === 'track'
              ? `Song - ${item.artists?.map((artist) => artist.name).join(', ')}`
              : ''
          }
          descriptionStyle={styles.description}
          left={() =>
            (item.images && item.images.length > 0) || (item.album && item.album.images && item.album.images.length > 0) ? (
              <Image 
                source={{
                  uri:
                    item.type === 'track' && item.album?.images?.length
                      ? item.album.images[0].url
                      : item.images && item.images.length > 0
                      ? item.images[0].url
                      : 'fallback_image_url'
              }}
              style={styles.thumbnail}
            />
            ) : (
              <List.Icon icon="music" />
            )
          }
          right={() =>
            <View style={styles.rightContainer}>
            <IconButton
               icon="plus-circle-outline"
               size={25}
               onPress={() => handleAddSong(item)}
               style={styles.add_icon}
               iconColor="white"
             />
            </View>
          }
        />
      )}/>
    </GestureHandlerRootView>

    {/* First Modal: shows the option to add song to a new or existing playlist  */}
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <Text variant="headlineMedium" style={styles.addTitle}>Add to Playlist</Text>
          <Button
            onPress={openNewPlaylistModal}
            style= {styles.newPlaylistButton}
            labelStyle={{color: 'black'}}>
              New Playlist
          </Button>

          {
        //   <FlatList 
        //   data={firebasePlaylists} 
        //   keyExtractor={(item: SpotifyItem) => item.id}
        //   renderItem={({ item }: { item: SpotifyItem }) => (
        //     <List.Item
        //       onPress={() => onPlaylistClicked(item.id)}
        //       title={() => (
        //         <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        //           {item.name}
        //         </Text>
        //       )}
        //       left={() =>
        //         item.uri ? (
        //           <Image 
        //             source={typeof item.uri === 'string' ? { uri: item.uri } : item.uri as number} 
        //             style={styles.thumbnail} 
        //           />
        //         ) : (
        //           <List.Icon icon="music" />
        //         )
        //       }
        //       right={() => (
        //         <View style={styles.rightContainer}>
        //           <IconButton
        //             icon="arrow-right-circle-outline"
        //             size={25}
        //             style={styles.arrowIcon}
        //             iconColor='white'
        //           />
        //         </View>
        //       )}
        //     />
        //   )}
        // />
        /* <GestureHandlerRootView style={{ flex: 1 }}>
                  <FlatList 
                    data={filteredResults} 
                    keyExtractor={(item: SpotifyItem) => item.id}
                    renderItem={({ item }: { item: SpotifyItem }) => (
                      <List.Item
                        // Navigate to the playlist clicked function
                        onPress={() => onPlaylistClicked(item.id)}
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
                </GestureHandlerRootView> */}

          <Button
            onPress={closeModal}
            labelStyle={{ color:'white'}}>
              Cancel
          </Button>
        </ThemedView>
      </View>
    </Modal>
  {/* Second Modal: shows the option to create a new playlist */} 
  <Modal
    visible={newPlaylistModalVisible}
    transparent={true}
    onRequestClose={closeNewPlaylistModal}>
    <View style={styles.innerContainer}>
      <ThemedView style={styles.playlistModalContent}>
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
}


const styles = StyleSheet.create({
 overall: {
  alignItems: 'center',
  flex:1,
  justifyContent: 'flex-start',
  paddingTop: 60,
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
  marginBottom: 20,
  flex: 1,
 },
 subtitleContainer: {
  width: '100%',
  paddingLeft: 25,
 },
 subtitle: {
  color: 'darkgrey',
  fontWeight: 'normal',
  fontSize: 18,
  textAlign: 'left'
 },
 name:{
  left:25,
  color: 'white'
 },
 description:{
  left:25,
  color:'grey'
 },
 thumbnail: {
  width: 50,
  height: 50,
  borderRadius: 4,
  left:25
 },
 rightContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingRight: 34,  
 },
 add_icon: {
  width: 24, 
  height: 24,
  right: -24
 },
 modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  width: '100%',
  height:'90%',
  backgroundColor: 'transparent',
  padding: 20,
  borderRadius: 10,
  alignItems: 'center',
  // borderWidth: 2,  // Adds a border
  // borderColor: 'black',  // Sets the border color
 },
 playlistModalContent: {
  backgroundColor: 'black',
  padding: 20,
  borderRadius: 10,
  alignItems: 'center',
  width: '80%',
  maxWidth: 400,
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
  flex: 1,
  justifyContent: 'center',
  color: 'grey',
  alignItems: 'center',

 },
addTitle: {
  color: 'white',
  fontSize: 20,
  marginBottom: 20,
},
newPlaylistButton: {
  backgroundColor: 'white',
  marginBottom: 20,
  width: '50%',
  paddingVertical: 10,
  borderRadius: 30,
  height: 60,
  
},
playlistInput: {
  width: '80%',
  marginBottom: 20,
},
arrowIcon: {
  width: 24,
  height: 24,
  right:10
 },
});
