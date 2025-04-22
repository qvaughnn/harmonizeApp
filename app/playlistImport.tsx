import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, Pressable} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, Searchbar, List, Button, IconButton, Modal, TextInput, Checkbox} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlatList } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { set } from 'firebase/database';

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
              uri: require('../assets/images/coverSample.png'),
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
          keyExtractor={(item: SpotifyItem) => item.id}
          renderItem={({ item }: { item: SpotifyItem }) => {
            const isSelected = checkedPlaylists.includes(item.id);
            return(            
                <List.Item
                    onPress={() => router.push(`/playlist?id=${item.id}`)}
                    title={() => (
                        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                        {item.name}
                        </Text>
                    )}
                    style={isSelected && styles.selectedItem}
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
            onPress={() => router.replace('/(tabs)/home')}
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
