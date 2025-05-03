import { Image, StyleSheet, Dimensions, Pressable, View, Modal, Button} from 'react-native';
import { Text, Avatar, Card, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Carousel from 'react-native-snap-carousel-v4';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { database } from '../config/firebase';
import { PlaylistPreview, Playlist, UserRef, Song } from '@/types';
import { ref, set, get, onValue, push } from 'firebase/database';
import { useMusicService } from '../../contexts/MusicServiceContext';

const { width } = Dimensions.get('window');

const Home = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { token } = useAuth();
  const [results, setResults] = useState<PlaylistPreview[]>([]);
  const { setMusicService, musicService } = useMusicService();

  const friends = [
    {name: 'Alice', playlists: 4, avatar:require('../../assets/images/avatar.png')},
    {name: 'Charlie', playlists: 2, avatar:require('../../assets/images/avatar.png')},
    {name: 'Lucy', playlists: 8, avatar:require('../../assets/images/avatar.png')},
  ];


  console.log("Curr user: ", currentUser.id);
  // Fetch playlists the user has access to from Firebase
  useEffect(() => {
    if (!currentUser?.id) return;
    const userPlaylistsRef = ref(database, `users/${currentUser.id}/userPlaylists`);
    const userSpotRef = ref(database, `users/${currentUser.id}/Spotify`);
    console.log("MusicService1: ", musicService);
    get(userSpotRef).then((snapshot) => {
      if (!snapshot.exists()) {
        setMusicService('AppleMusic');
      }
    });
    console.log("MusicService2: ", musicService);
    console.log("In home.tsx: ", userPlaylistsRef);
    const unsubscribe = onValue(
      userPlaylistsRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const ids: string[] = Object.keys(snapshot.val() || {});
          const promises = ids.map((id) =>
            get(ref(database, `playlists/${id}`)).then((snap) => (snap.exists() ? snap.val() : null))
          );
          const playlistsData = (await Promise.all(promises)).filter((p) => p);
          const previews: PlaylistPreview[] = playlistsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            cover_art: p.cover_art,
          }));
          setResults(previews);
        } else {
          setResults([]);
        }
      },
      (error) => {
        console.error('Error fetching user playlists:', error);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Navigate to /playlist screen, passing the playlistId
  const handlePlaylistPress = (playlistId: string) => {
    // Example: pass it as a query param: /playlist?id=xxxxx
    router.push(`/playlist?id=${playlistId}`);
  };

  const renderCarouselItem = ({ item }: { item: PlaylistPreview }) => (
    <Pressable onPress={() => handlePlaylistPress(item.id)}>
      <Card style={{ borderRadius: 10 }}>
        <View style={{ borderRadius: 10, overflow: 'hidden' }}>
          <Image
            source={typeof item.cover_art === 'string' ? { uri: item.cover_art } : item.cover_art}
            style={{ width: '100%', height: 270 }}
            resizeMode="cover"
          />
        </View>
      </Card>
    </Pressable>
  );

  const ImageCarousel = () => (
    <Carousel
      data={results}
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
  };

  const [visible, setVisible] = useState(false);

  const showPopup = () => setVisible(true);

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

      <View style={styles.listContainer}>
        {friends.map((friend,index) => (
          <Card key={index} style={styles.friendCard}>
            <View style={styles.friendInfo}>
              <Avatar.Image size={40} source={friend.avatar}/>
              <View style={styles.textContainer}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.playlistText}>{friend.playlists} playlists</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <IconButton
        icon="information-outline"
        size={40}
        onPress={toggleModal}
        style={styles.addIcon}
        iconColor="white"
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisbile}
        onRequestClose={toggleModal} // handles back button
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.subtitleAbout}>About Us</Text>
            <Text style={styles.modalText}>Want to connect with a{"\n"}different music platform than you?{"\n"}Create a collaborative playlist{"\n"}with your friends!</Text>
            <Button title="Got it!" onPress={toggleModal} />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

export default Home;

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
  subtitleAbout: {
    fontWeight: 'bold',
    color: 'grey',
    fontSize: 30,
    marginBottom: 10,
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
  listContainer: {
    width: '100%',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 550,
    position: 'absolute',
    left: 25
  },
  friendCard: {
    width: '70%',
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 10,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  playlistText: {
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
    padding: 25,
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
    marginBottom: 10,
    textAlign: 'center',
  },
  addIcon: {
    right: 10,
    bottom: 100,
    position: 'absolute',
    justifyContent: 'flex-start',
  },
});
