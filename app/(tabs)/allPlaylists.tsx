import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, Searchbar, List, Button } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
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

  };

  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        PLAYLISTS
      </Text>
      <Button>
        icon = "plus"
        mode = "contained"
        top: 80
      </Button>

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
                  <Image
                    source={require('../../assets/images/arrow.png')}
                    style={styles.arrowIcon}
                  />
                </View>
              )}
            />
          )}
        />
      </GestureHandlerRootView>
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
});
