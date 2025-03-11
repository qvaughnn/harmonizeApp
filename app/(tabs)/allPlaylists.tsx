import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Searchbar, List } from 'react-native-paper';
import React from 'react';
import { useState, useEffect, useContext } from 'react';
import { getAuth, signInAnonymously } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlatList } from 'react-native-gesture-handler';

const AllPlaylists = () =>{

  const { token, setToken } = useAuth(); 
  const [searchQuery, setSearchQuery] = React.useState('');
  const [results, setResults] = React.useState<SpotifyItem[]>([]);
  
  type SpotifyItem = {
    id: string;
    name: string;
    images?: { url: string }[];
    uri: string | number;
  };

  function handleSearchQueryChange(query: string): void {
    setSearchQuery(query);
  }

  useEffect(() => {
      if (token) {
        fetchPlaylist();
      }
    }, [token]);

  const fetchPlaylist = async () => {
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
          // console.log("FETCHED PLAYLISTS: ", fetchedPlaylists);
          setResults(fetchedPlaylists);
      } else {
        console.error("Error fetching playlists:", data);
      }
    } catch (error) {
      console.error("Playlists fetch error:", error);
    }
  };

 return (
  <ThemedView style={styles.overall}>
    <Text variant="displayMedium" style={styles.title}>
      PLAYLISTS
    </Text>
    <View style = {styles.searchContainer}>
      <Searchbar
        placeholder="Search Playlists"
        value={searchQuery}
        onChangeText={handleSearchQueryChange}
        style={styles.searchbar}
      />
    </View>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlatList 
        data={results} 
        keyExtractor={(item: SpotifyItem) => item.id}
        renderItem={({ item}: { item: SpotifyItem }) => (
        <List.Item
        title={item.name}
        titleStyle={styles.name}
        left={() =>
          item.uri ? (
            <Image source={typeof item.uri === 'string' ? { uri: item.uri } : (item.uri as number)} style={styles.thumbnail} />
          ) : (
            <List.Icon icon="music" />
          )
        }
        right={() =>
          <View style={styles.rightContainer}>
          <Image
            source={require('../../assets/images/arrow.png')}
            style={styles.arrowIcon}
          />
          </View>
        }
      />
    )}/>
    </GestureHandlerRootView>
  </ThemedView>
 );
}

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
  left:25,
  color: 'white',
  fontSize: 18,
  fontWeight: "bold"
 },
});
