import { Image, StyleSheet, Platform, View, ImageBackground, Pressable, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Searchbar, List } from 'react-native-paper';
import * as React from 'react';
import { FlatList } from 'react-native-gesture-handler';
import { getAuth, signInAnonymously } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const auth = getAuth();
const CLIENT_ID = '9c9e9ac635c74d33b4cec9c1e6878ede';
const REDIRECT_URI = 'exp://10.140.46.209:8081';
const SCOPES = ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public'];


const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

type SpotifyItem = {
  id: string;
  name: string;
  artists?: { name: string }[];
  images?: { url: string }[];
};

export default function TabTwoScreen() {
 const [searchQuery, setSearchQuery] = React.useState('');
 const [results, setResults] = React.useState<SpotifyItem[]>([]);
 const [loading, setLoading] = React.useState(false);
 const {token} = useAuth();


 async function handleSearchQueryChange(query: string){
   setSearchQuery(query);

   if (query.length > 2) { //makes sure we have a long enough request
    if (!token) { //checks that we have authorization to request a search
      console.error("Token is missing!");
      return;
    }
    getResults(query);
  } else {
    setResults([]); // Clear results
  }
}
 async function getResults(query: string) {
  try {
    setLoading(true);
    const response = await fetch(
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
      ...(data.artists?.items || []),
      ...(data.albums?.items || []),
      ...(data.tracks?.items || []),
    ];

    setResults(results);
  } catch (error) {
    console.error("Error fetching Spotify search:", error);
  } finally {
    setLoading(false);
  }
}

  const handleAdd = (item : SpotifyItem) => {
    console.log("Adding song: $(item.name) by ")

    //add to playlist API call
  }


 return (
   <ThemedView style={styles.overall}>
     <Text variant="displayMedium" style={styles.title}>
       SEARCH
     </Text>


    <View style = {styles.searchContainer}>
           <Searchbar
             placeholder="Search Playlists, Friends, and Songs"
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
          description={item.artists ? item.artists.map((artist: { name: any; }) => artist.name).join(', ') : 'Playlist'}
          descriptionStyle={styles.description}
          left={() =>
            item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0].url }} style={styles.thumbnail} />
            ) : (
              <List.Icon icon="music" />
            )
          }
          right={() =>
            <View style={styles.rightContainer}>
            <Image
              source={require('../../assets/images/add-icon.png')}
              style={styles.add_icon}
            />
            </View>
          }
        />
      )}
    />
  </GestureHandlerRootView>


         
   {/* <View style={styles.subtitleContainer}>
     <Text variant="displayMedium" style={styles.subtitle}>
         Recent Searches
       </Text>
   </View> */}
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
  paddingRight: 16, 
  },
 add_icon: {
  width: 24, // Adjust size as needed
  height: 24,
 },
});
