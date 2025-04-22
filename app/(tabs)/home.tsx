import { Image, StyleSheet, Dimensions, Pressable, View, Modal, Button} from 'react-native';
import { Text, Avatar, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Carousel from 'react-native-snap-carousel-v4';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { useState, useEffect } from 'react';
import { useMusicService } from '../../contexts/MusicServiceContext';
const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const { token } = useAuth(); 
  const [images, setImages] = useState<{ id: string; uri: string }[]>([]);
  const { musicService } = useMusicService();

  useEffect(() => {
    if (token) {
      fetchPlaylists();
    }
    if (musicService === 'AppleMusic'){
      fetchPlaylists();
    }
  }, [token, musicService]);

  const friends = [
    {name: 'Alice', playlists: 4, avatar:require('../../assets/images/avatar.png')},
    {name: 'Charlie', playlists: 2, avatar:require('../../assets/images/avatar.png')},
    {name: 'Lucy', playlists: 8, avatar:require('../../assets/images/avatar.png')}, 
  ]

  const fetchPlaylists = async () => {
    try {
      if (musicService === 'AppleMusic'){  //Fetches user playlists if musicService is set to AppleMusic
        console.log("Using music service:", musicService);
        const response = await fetch("https://api.music.apple.com/v1/me/library/playlists", {
          method: "GET",
          headers: {
            Authorization: `Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6Ijc0MzhSRjk3NTYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJDNjU4Vzc3RFk4IiwiaWF0IjoxNzQxNTYxMzgwLCJleHAiOjE3NTEzMjgwMDB9.cAagA4ENdoK2CiR_OOdfz3xfes9ra1B_QET8LsCynJt3pqaID6dEr79RajYeDHb_q4yZfhb3V5HmLOff1XBoLA`,
            "Music-User-Token": "AtQfI0H0emIFKjAFHiInF+dmB3DfER2qT+fz3CKCQbSYxsuSETT10Mjz2yh4UKTIIJPRXPced+W7dHC0I9FA9497Xly9fd6WcplgoABAE+fts+ZQMYw4NgnEXaMFNzOPMpGHfiVdKc2rDX6PLK3fyIwzq9WisJR3s67XPgI9LWJWMMMrYtFPh9iu4ONxLkNGK1tyihGM98+/Voa3obC4d7XueFgDw2QyZzk4NJ2E1ETF7q0z2A==",
            "Content-Type": "application/json",
            },
          });

        const data = await response.json();


        if (response.ok) {
          const playlistsData = data.data || [];
          const fetchedImages = playlistsData.map((playlist: any) => {
            const attributes = playlist.attributes || {};
            return {
              id: playlist.id,
              uri: attributes.artwork?.url
                ? attributes.artwork.url.replace('{w}x{h}', '200x200')
                : require('../../assets/images/coverSample.png'),
            };
          });



          setImages(fetchedImages);
//          setFilteredResults(fetchedPlaylists);
        }
        else{
          console.error("AppleMusic API error:", data);
        }

      }
      else{   //Fetches user playlists if musicService is not AppleMusic

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
          const fetchedImages = playlistsData.map((playlist: any) => ({
            id: playlist.id,
            uri:
              playlist.images && playlist.images.length > 0
                ? playlist.images[0].url
                : require('../../assets/images/coverSample.png'),
          }));
          setImages(fetchedImages);
//          setFilteredResults(fetchedPlaylists);
        } else {
          console.error("Error fetching cover art:", data);
        }
      }
    } catch (error) {
      console.error("Playlists fetch error:", error);
    }
  };
/*    try {
      const response = await fetch('https://api.spotify.com/v1/me/playlists', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        // Extract the playlist images
        const fetchedImages = (data.items || []).map((playlist: any) => ({
          id: playlist.id,
          uri:
            playlist.images && playlist.images.length > 0
              ? playlist.images[0].url
              : require('../../assets/images/coverSample.png'),
        }));
        setImages(fetchedImages);
      } else {
        console.error('Error fetching playlists:', data);
      console.error('Playlists fetch error:', error);
    }
  };
*/

  // Navigate to /playlist screen, passing the playlistId
  const handlePlaylistPress = (playlistId: string) => {
    // Example: pass it as a query param: /playlist?id=xxxxx
    router.push(`/playlist?id=${playlistId}`);
  };

  const renderCarouselItem = ({ item }: { item: { id: string; uri: any } }) => (
    <Pressable onPress={() => handlePlaylistPress(item.id)}>
      <Card style={{ borderRadius: 10 }}>
        <View style={{ borderRadius: 10, overflow: 'hidden' }}>
          <Image
            source={typeof item.uri === 'string' ? { uri: item.uri } : item.uri}
            style={{ width: '100%', height: 270 }}
            resizeMode="cover"
          />
        </View>
      </Card>
    </Pressable>
  );

  const ImageCarousel = () => (
    <Carousel
      data={images}
      renderItem={renderCarouselItem}
      sliderWidth={width}
      itemWidth={width * 0.8}
      loop={false}
      autoplay={false}
      containerCustomStyle={{ marginTop: 220 }}
    />
  );

  const [modalVisbile, setModalVisible] = useState(false);

  const toggleModal = () => {
    setModalVisible(!modalVisbile);
  }

  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        HARMONIZE
      </Text>

      <Pressable style={styles.icon} onPress={() => router.push('/profile')}>
        <Avatar.Image size={50} source={require('../../assets/images/avatar.png')} />
      </Pressable>

      <Pressable onPress={() => router.push('/allPlaylists')} style={styles.subtitlePress}>
        <Text variant="headlineMedium" style={styles.subtitle}>
          PLAYLISTS
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/allPlaylists')} style={styles.viewPress}>
        <Text style={styles.view}>View all</Text>
      </Pressable>

      <ImageCarousel />

      <Pressable onPress={() => router.push('/friends')} style={styles.subtitlePress2}>
        <Text variant="headlineMedium" style={styles.subtitle2}>
          FRIENDS
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(tabs)/friends')} style={styles.viewPress2}>
        <Text style={styles.view}>View all</Text>
      </Pressable>

      <View style = {styles.listContainer}>
          {friends.map((friend,index) =>(
            <Card key={index} style={styles.friendCard}>
              <View style = {styles.friendInfo}>
                <Avatar.Image size={40} source = {friend.avatar}/>
                <View style = {styles.textContainer}>
                  <Text style = {styles.friendName}> {friend.name}</Text>
                  <Text style = {styles.playlistText}> {friend.playlists} playlists</Text>
                </View>
              </View> 
            </Card>
          ))}
        </View>

      <Pressable onPress={toggleModal}>
          <Image
            source={require('../../assets/images/add-icon.png')}
            style={styles.add_icon}
          />
      </Pressable>

      <Modal
        animationType = 'fade'
        transparent = {true}
        visible = {modalVisbile}
        onRequestClose={toggleModal} // handles back button
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Create a playlist</Text>
            <Button title="Close" onPress={toggleModal} />
          </View>
        </View>

      </Modal>
      
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overall: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: 'darkgrey',
    position: 'absolute',
    top: 80,
    left: 25,
  },
  icon: {
    position: 'absolute',
    right: 20,
    top: 80,
  },
  subtitlePress: {
    position: 'absolute',
    top: 170,
    left: 25,
  },
  subtitle: {
    fontWeight: 'bold',
    color: 'white',
  },
  viewPress: {
    position: 'absolute',
    top: 185,
    right: 25,
  },
  view: {
    color: 'white',
  },
  subtitlePress2: {
    position: 'absolute',
    top: 500,
    left: 25,
  },
  subtitle2: {
    fontWeight: 'bold',
    color: 'white',
  },
  viewPress2: {
    position: 'absolute',
    top: 515,
    right: 25,
  },
  add_icon: {
    position: 'absolute',
    height: 40,
    width: 40,
    bottom: 100,
    left: 140,
  },
  listContainer:{
    width: '100%',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 550,
    position: 'absolute',
    left: 25
  },
  friendCard:{
    width: '70%',
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 10,
  },
  friendInfo:{
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer:{
    marginLeft:12,
  },
  friendName:{
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  playlistText:{
    fontSize: 14,
    color: 'white'
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});
