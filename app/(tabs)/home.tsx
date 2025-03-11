import { Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Text, Avatar, Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Carousel from 'react-native-snap-carousel-v4';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { useState, useEffect } from 'react';

const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const { token } = useAuth(); 
  const [images, setImages] = useState<{ id: string; uri: string }[]>([]);

  useEffect(() => {
    if (token) {
      fetchPlaylists();
    }
  }, [token]);

  const fetchPlaylists = async () => {
    try {
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
      }
    } catch (error) {
      console.error('Playlists fetch error:', error);
    }
  };

  // Navigate to /playlist screen, passing the playlistId
  const handlePlaylistPress = (playlistId: string) => {
    // Example: pass it as a query param: /playlist?id=xxxxx
    router.push(`/playlist?id=${playlistId}`);
  };

  const renderCarouselItem = ({ item }: { item: { id: string; uri: any } }) => (
    <Pressable onPress={() => handlePlaylistPress(item.id)}>
      <Card style={{ borderRadius: 10, overflow: 'hidden' }}>
        <Image
          source={typeof item.uri === 'string' ? { uri: item.uri } : item.uri}
          style={{ width: '100%', height: 270 }}
          resizeMode="cover"
        />
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

      <Image
        source={require('../../assets/images/add-icon.png')}
        style={styles.add_icon}
      />
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
    top: 170,
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
  add_icon: {
    position: 'absolute',
    height: 40,
    width: 40,
    bottom: 100,
    right: 25,
  },
});
