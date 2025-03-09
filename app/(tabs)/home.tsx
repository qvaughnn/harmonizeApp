import { Image, StyleSheet, Platform, View, ImageBackground, Pressable, Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Avatar, Card} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
// import Carousel from 'react-native-snap-carousel';
import Carousel from 'react-native-snap-carousel-v4';
import Profile from '../profile';
import Playlists from './allPlaylists';
import Playlist from '../playlist';
import Friends from './friends';

const { width } = Dimensions.get('window');

const images = [
  { id: '1', uri: require('../../assets/images/coverSample.png') },
  { id: '2', uri: require('../../assets/images/coverSample.png')},
  { id: '3', uri: require('../../assets/images/coverSample.png') },
  { id: '4', uri: require('../../assets/images/coverSample.png')},
];

const ImageCarousel = ({ onPress }: { onPress: () => void }) =>{
  const renderItem = ({ item }: { item: { id: string; uri: any } }) => (
    <Pressable onPress={onPress}>
      <Card style={{ borderRadius: 10, overflow: 'hidden' }}>
        <Image source={item.uri} style={{ width: '100%', height: 270 }} resizeMode="cover" />
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
export default function TabTwoScreen() {

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

{/* 
      <Pressable>
        <Image
          source={require('../../assets/images/coverSample.png')}
          style={styles.cover}
        />
      </Pressable> */}

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
    top: 725,
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

