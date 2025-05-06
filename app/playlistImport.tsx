import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, Pressable} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, Searchbar, List, Button, IconButton, Modal, TextInput, Checkbox} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlatList } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useMusicService } from '../contexts/MusicServiceContext';
import { ref, set, get, child } from 'firebase/database';
import { database, fireDB } from "./config/firebase";
import { Playlist, PlaylistPreview, UserRef, Song } from '@/types';
import { update, push } from 'firebase/database';
import { encode as btoa } from 'base-64';
import { collection, getDocs } from "firebase/firestore"; 

const AllPlaylists = () => {
  const { token, currentUser } = useAuth(); 
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { musicService } = useMusicService();
  const [results, setResults] = useState<PlaylistPreview[]>([]);
  const [filteredResults, setFilteredResults] = useState<PlaylistPreview[]>([]);

  


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
      await getFirestore();
    } catch (error) {
      console.error('Error fetching data from Firestore:', error);
    }
  };

  fetchFirestoreData();
}, []);


  
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

  useEffect(() => {
    if (token) {
      fetchPlaylists();
    }
    if (musicService === 'AppleMusic'){
      fetchPlaylists();
    }
  }, [token]);


  const getAlreadyImportedOriginalIds = async (): Promise<string[]> => {
  const importedOriginalIds: string[] = [];
  console.log("Current user ID: ", currentUser.id);
  const userPlaylistRef = ref(database, `users/${currentUser.id}/userPlaylists`);
  const userPlaylistsSnap = await get(userPlaylistRef);

  if (!userPlaylistsSnap.exists()) return [];

  const userPlaylists = userPlaylistsSnap.val();
  const playlistIds = Object.keys(userPlaylists);

  for (const pid of playlistIds) {
    const playlistSnap = await get(ref(database, `playlists/${pid}/original_id`));
    if (playlistSnap.exists()) {
      importedOriginalIds.push(playlistSnap.val());
    }
  }

  return importedOriginalIds;
};


  const fetchPlaylists = async () => {
    try {
      console.log("Inside fetchPlaylists");
      const alreadyImported = await getAlreadyImportedOriginalIds();
      console.log("Already imported: ", alreadyImported);


      if (musicService === 'AppleMusic') {
        const appleDev = await getFirestore();
        const response = await fetch("https://api.music.apple.com/v1/me/library/playlists", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${appleDev}`,
            "Music-User-Token": currentUser.uToken,
            "Content-Type": "application/json",
          },
        });

       if (response.status === 401 || response.status === 403) {
         router.replace('/connect');
         throw new Error("Apple token expired, redirected to login.");
       }

        const data = await response.json();
        if (response.ok) {
          const playlistsData = data.data || [];
          const fetchedPlaylists = playlistsData.filter((playlist: any) => !alreadyImported.includes(playlist.id))
            .map((playlist: any) => {
            const attributes = playlist.attributes || {};
            return {
              id: playlist.id,
              name: attributes.name,
              uri: attributes.artwork?.url
                ? attributes.artwork.url.replace('{w}x{h}', '20x20')
                : require('../assets/images/coverSample.png'),
            };
          });
          setResults(fetchedPlaylists);
          setFilteredResults(fetchedPlaylists);
        } else {
          console.error("Apple Music playlist fetch error:", data);
        }
      } else {
      console.log("Testing Spotify fetchPlaylist");
      console.log("Token: ", token);
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Fetch response: ", response);

      const data = await response.json();

      console.log("Data test: ", data);
  
      if (response.ok) {
        const playlistsData = data.items || [];
  
        const fetchedPlaylists: PlaylistPreview[] = playlistsData.map((playlist: any): PlaylistPreview => {
          return {
            id: playlist.id,
            name: playlist.name,
            cover_art:
              playlist.images?.[0]?.url ?? require('../assets/images/coverSample.png'),
          };
        });

        console.log("Fetched playlists: ", fetchedPlaylists);
 
        setResults(fetchedPlaylists);
        setFilteredResults(fetchedPlaylists);
      } else {
        console.error("Error fetching playlists:", data);
      }}
    } catch (error) {
      console.error("Playlists fetch error:", error);
    }
  };




  const importCheckedPlaylists = async () => {
  try {
    for (const playlistId of checkedPlaylists) {
      let playlistData: any;
      let tracksData: any[] = [];

      const owner: UserRef = {
        id: currentUser?.id ?? 'unknown-user-id',
        name: currentUser?.name ?? 'Unknown User',
      };

      if (musicService === 'Spotify') {
        // Fetch Spotify Playlist Info
        const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const playlistJson = await playlistResponse.json();

        if (!playlistResponse.ok) {
          console.error(`Error fetching Spotify playlist ${playlistId}:`, playlistJson);
          continue;
        }

        playlistData = playlistJson;
        tracksData = playlistJson.tracks?.items || [];
      } else {
        // Fetch Apple Music Playlist Info

        const appleDev = await getFirestore();
        const playlistResponse = await fetch(`https://api.music.apple.com/v1/me/library/playlists/${playlistId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${appleDev}`,
            'Music-User-Token': currentUser.uToken,
            'Content-Type': 'application/json',
          },
        });

        if (playlistResponse.status === 401 || playlistResponse.status === 403) {
          router.replace('/connect');
          throw new Error("Apple token expired, redirected to login.");
        }

        const playlistJson = await playlistResponse.json();

        if (!playlistResponse.ok) {
          console.error(`Error fetching Apple playlist ${playlistId}:`, playlistJson);
          continue;
        }

        playlistData = playlistJson.data?.[0];

        // Fetch Tracks separately
        const songsResponse = await fetch(`https://api.music.apple.com/v1/me/library/playlists/${playlistId}/tracks`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${appleDev}`,
            'Music-User-Token': currentUser.uToken,
            'Content-Type': 'application/json',
          },
        });

        const songsJson = await songsResponse.json();

        if (!songsResponse.ok) {
          console.error(`Error fetching Apple playlist tracks ${playlistId}:`, songsJson);
          continue;
        }

        tracksData = songsJson.data || [];
      }

      // Push to Firebase
      const playlistRef = push(ref(database, 'playlists'));
      const generatedId = playlistRef.key;

      const playlist: Playlist = {
        id: generatedId || playlistId,
        original_id: playlistId,
        name: playlistData?.attributes?.name ?? playlistData?.name ?? 'Unnamed Playlist',
        description: playlistData?.attributes?.description?.standard ?? playlistData?.description ?? 'Description placeholder',
        cover_art: playlistData?.attributes?.artwork?.url
          ? playlistData.attributes.artwork.url.replace('{w}x{h}', '400x400')
          : playlistData?.images?.[0]?.url ?? require('../assets/images/coverSample.png'),
        owner,
        harmonizers: [owner],
        og_platform: musicService.toLowerCase(),
        songs: tracksData.map((item: any): Song => {
          if (musicService === 'Spotify') {
            const track = item.track;
            return {
              spotify_id: track.id,
              name: track.name,
              artist: track.artists.map((a: any) => a.name).join(', '),
              spotify_uri: track.uri,
              duration_ms: track.duration_ms ?? 0,
              cover_art: track.album?.images?.[0]?.url ?? '',
              album: track.album?.name ?? 'Unknown Album',
            };
          } else {
            return {
              spotify_id: item.id,
              name: item.attributes?.name ?? 'Unknown Song',
              artist: item.attributes?.artistName ?? 'Unknown Artist',
              spotify_uri: '',
              duration_ms: 0, // Apple Music doesn't give duration easily in library tracks
              cover_art: item.attributes?.artwork?.url
                ? item.attributes.artwork.url.replace('{w}x{h}', '400x400')
                : '',
              album: item.attributes?.albumName ?? 'Unknown Album',
            };
          }
        }),
      };


      await set(playlistRef, playlist);

      // Save playlist reference under the user
      if (currentUser?.id) {
        const updates: Record<string, any> = {};
        updates[`users/${currentUser.id}/userPlaylists/${generatedId}`] = true;
        await update(ref(database), updates);
      }

      console.log(`Successfully imported playlist: ${playlist.name}`);
    }

    // Optional: Navigate back home after import
    router.replace('/(tabs)/home');

  } catch (error) {
    console.error('Error importing playlists:', error);
  }
};


  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  const showPopup = () => setVisible(true);
  const hidePopup = () => setVisible(false);

  const [checkedPlaylists, setCheckedPlaylists] = useState<string[]>([]);

  const togglePlaylist = (playlistId: string) => {
    setCheckedPlaylists(prev =>
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  return (
    <ThemedView style={styles.overall}>
      <Text variant="displaySmall" style={styles.title}>
        IMPORT PLAYLISTS
      </Text>

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
          keyExtractor={(item: PlaylistPreview) => item.id}
          renderItem={({ item }: { item: PlaylistPreview }) => {
            const isSelected = checkedPlaylists.includes(item.id);
            return(            
                <List.Item
//                    onPress={() => router.push(`/playlist?id=${item.id}`)}
                    onPress={() => router.push(`/playlist?id=${playlist.id}`)}
                    title={() => (
                        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                        {item.name}
                        </Text>
                    )}
                    style={isSelected && styles.selectedItem}
                    left={() =>
                        item.cover_art ? (
                        <Image 
                            source={typeof item.cover_art === 'string' ? { uri: item.cover_art } : (item.cover_art as number)}
                            style={styles.thumbnail} 
                        />
                        ) : (
                        <List.Icon icon="music" />
                        )
                    }
                    right={() => (
                        <Pressable onPress={() => togglePlaylist(item.id)}>
                            <View style={[styles.customCheckbox, isSelected && styles.customCheckboxChecked]}>
                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                        </Pressable>
                    )}
                />
            )}}
        />
      </GestureHandlerRootView>

        <Modal 
            visible={visible} 
            onDismiss={hidePopup} 
            contentContainerStyle={styles.modalContainer}
        >
        <View style={styles.innerContainer}>
          <ThemedView style={styles.modalContent}>
            <Text style={styles.modalText}>Playlist Name:</Text>
            <TextInput
              mode="outlined"
              value={text}
              onChangeText={setText}
              style={styles.input}
            />
            <Button mode="contained" onPress={hidePopup} style={styles.button}>
              Create
            </Button>
          </ThemedView>
        </View>
      </Modal>
      {checkedPlaylists.length > 0 && (
    <View style={styles.bottomButtonContainer}>
        <Button 
            mode="contained" 
            onPress={importCheckedPlaylists}
            style={styles.continueButton}
            labelStyle={styles.continueButtonText}
        >
        CONTINUE
        </Button>
    </View>
    )}
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
  paddingRight: 16,
  height: '100%',
 },
 thumbnail: {
  width: 80,
  height: 80,
  borderRadius: 4,
  left:25
 },
 name:{
  left: 20,
  color: 'white',
  width: '87%',
  fontSize: 18,
  fontWeight: "bold"
 },
 popup: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
 },
 modalContent: {
  width: '100%',
  height: '80%',
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 10,
  alignItems: 'center',
 },
 modalContainer: {
  backgroundColor: 'white',
  padding: 20,
  width: 300, // Explicit width
  alignSelf: 'center',
  borderRadius: 10,
 },
 innerContainer: {
  justifyContent: 'center',
  color: 'grey',
 },
modalText: {
  fontSize: 18,
  marginBottom: 10,
  color: 'grey',
 },
 input: {
  width: '100%',
  marginBottom: 20,
 },
button: {
    alignSelf: 'center',
    width: '80%',
},
playlistItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
},
  
bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
},

continueButton: {
    borderRadius: 24,
    paddingVertical: 10,
},

customCheckbox: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#4A235A',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    top:20,
    backgroundColor: '#D2B4DE',
  },
  
  customCheckboxChecked: {
    borderColor: '#4A235A',
  },
  
  checkmark: {
    fontSize: 16,
    color: '#4A235A',
    fontWeight: 'bold',
  },

  continueButtonText:{
    fontSize:20,
    fontWeight: 'bold',
  },
  selectedItem: {
    backgroundColor: '#4A235A',
  },  
});
