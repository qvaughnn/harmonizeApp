import { Image, StyleSheet, Platform, View, ImageBackground, Pressable, Dimensions, Flatlist } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Avatar, Card} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect, useContext } from 'react';
import Carousel from 'react-native-snap-carousel-v4';
import Profile from '../profile';
import Playlists from './allPlaylists';
import Playlist from '../playlist';
import Friends from './friends';
import { getAuth, signInAnonymously } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";

const { width } = Dimensions.get('window');

const Home = () =>{

  const { token, setToken } = useAuth(); 
  // const [playlistsData, setPlaylistsData] = useState([]);
  const [images, setImages] = useState<{ id: string; uri: string }[]>([]);

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
      // console.log('API Response:', JSON.stringify(data, null, 2));
  
      if (response.ok) {
        const playlistsData = data.items || [];
          const fetchedImages = playlistsData.map((playlist: any) => {
            if (playlist.images && playlist.images.length > 0) {
              console.log(playlist);
              return {
                id: playlist.id,
                uri: playlist.images[0].url,
              };
            } else {
              return {
                id: playlist.id,
                uri: require('../../assets/images/coverSample.png'),
              };
            }
          });
          setImages(fetchedImages) 
      } else {
        console.error("Error fetching playlists:", data);
      }
    } catch (error) {
      console.error("Playlists fetch error:", error);
    }
  };

  const ImageCarousel = ({ onPress }: { onPress: () => void }) =>{
    const renderItem = ({ item }: { item: { id: string; uri: any } }) => (
      <Pressable onPress={onPress}>
        <Card style={{ borderRadius: 10, overflow: 'hidden' }}>
          <Image 
            source={typeof item.uri === 'string' ? { uri: item.uri } : item.uri}
            style={{ width: '100%', height: 270 }} 
            resizeMode="cover" 
          />
        </Card>
      </Pressable>
    );
  
    return (
      <Carousel
        data={images}
        renderItem={renderItem}
        sliderWidth={width}
        itemWidth={width * 0.8}
        loop={false}
        autoplay={false}
        scrollEnabled={true}
        containerCustomStyle={{ marginTop: 220 }} 
      />
    );
  };

  const router = useRouter();

  const handleUserIconPress = () => {
    router.push('/profile');
  };

  const handlePlaylistsPress = () => {
    router.push('/playlist');
  };

  const handleAllPlaylistsPress = () => {
    router.push('/allPlaylists');
  }

  const handleFriendsPress = () => {
    router.push('/friends');
  };

  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style = {styles.title}>
        HARMONIZE
      </Text>
      
      <Pressable style={styles.icon} onPress={handleUserIconPress}>
        <Avatar.Image size={50} source={require('../../assets/images/avatar.png')} />
      </Pressable>
      
      <Pressable onPress={handleAllPlaylistsPress} style={styles.subtitlePress}>
        <Text variant="headlineMedium" style = {styles.subtitle}>
          PLAYLISTS
        </Text>
      </Pressable>

      <Pressable onPress={handleAllPlaylistsPress} style={styles.viewPress}>
        <Text style = {styles.view}>
          View all
        </Text>
      </Pressable>

      <ImageCarousel onPress={handlePlaylistsPress}/>

      <Pressable onPress={handleFriendsPress} style = {styles.subtitlePress2}>
        <Text variant="headlineMedium" style = {styles.subtitle2}>
          FRIENDS
        </Text>
      </Pressable>

      <Image
        source = {require('../../assets/images/add-icon.png')}
        style = {styles.add_icon}
      />

    </ThemedView>
  );
}

export default Home;

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
    flex:1,
    // justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: 'darkgrey',
    position: 'absolute',
    top: 80,
    left: 25,
    justifyContent: 'flex-start',
  },
  subtitle: {
    fontWeight: 'bold',
    color: 'white',
  },
  subtitlePress:{
    position: 'absolute',
    top: 170,
    left: 25,
    justifyContent: 'flex-start',
  },
  subtitle2: {
    fontWeight: 'bold',
    color: 'white',
  },
  subtitlePress2:{
    position: 'absolute',
    top: 500,
    left: 25,
    justifyContent: 'flex-start',
  },
  view: {
    fontWeight: 'medium',
    color: 'white',
  },
  viewPress:{
    position: 'absolute',
    top: 170,
    right: 25,
    justifyContent: 'flex-start',
    fontSize: 15,
  },
  icon:{
    position: 'absolute',
    justifyContent: 'flex-start',
    right: 20,
    top: 80,
  },
  add_icon: {
    position: 'absolute',
    justifyContent: 'flex-start',
    height: 40,
    width: 40,
    bottom:100,
    right: 25,
  },
  cover: {
    // height: 230,
    // width: 230,
    top: 210,
    marginVertical: 20,
    // resizeMode: 'contain'
  },
});

