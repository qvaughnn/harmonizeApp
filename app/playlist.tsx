import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, Divider, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed
import { ThemedView } from '@/components/ThemedView';

export default function PlaylistScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { id: playlistId } = useLocalSearchParams(); // if you did /playlist?id=123

  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (playlistId && token) {
      fetchPlaylistData(playlistId as string);
    }
  }, [playlistId, token]);

  const fetchPlaylistData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setPlaylist(data);
      } else {
        console.error('Error fetching playlist:', data);
      }
    } catch (error) {
      console.error('Playlist fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTrackItem = ({ item }: { item: any }) => {
    // Each "item" in playlist.tracks.items is typically { track: { ...trackData } }
    const track = item.track;
    if (!track) return null; // In case of local or unavailable tracks

    return (
      <View style={styles.trackItem}>
        <Image
          source={{ uri: track.album.images?.[0]?.url }}
          style={styles.trackImage}
        />
        <View style={styles.trackInfo}>
          <Text style={styles.trackName}>{track.name}</Text>
          <Text style={styles.trackArtist}>
            {track.artists?.map((artist: any) => artist.name).join(', ')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading || !playlist) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <IconButton
          icon="arrow-left"
          size={30}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text variant="headlineLarge" style={styles.playlistTitle}>
          {playlist.name}
        </Text>
      </View>

      {/* Cover + Info */}
      <View style={styles.coverContainer}>
        {playlist.images && playlist.images[0] && (
          <Image
            source={{ uri: playlist.images[0].url }}
            style={styles.coverImage}
          />
        )}
        <View style={styles.playlistInfo}>
          <Text style={styles.owner}>
            By {playlist.owner?.display_name || 'Unknown'}
          </Text>
          {playlist.description ? (
            <Text style={styles.description}>{playlist.description}</Text>
          ) : null}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Tracks List */}
      <FlatList
        data={playlist.tracks?.items || []}
        renderItem={renderTrackItem}
        keyExtractor={(item, index) => item.track?.id || String(index)}
        contentContainerStyle={styles.trackList}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginLeft: 10,
  },
  playlistTitle: {
    fontWeight: 'bold',
    marginLeft: 10,
  },
  coverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 5,
    marginRight: 15,
  },
  playlistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  owner: {
    color: 'white',
    fontWeight: '600',
    marginBottom: 5,
  },
  description: {
    color: 'white',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 10,
  },
  trackList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  trackArtist: {
    color: 'grey',
    fontSize: 14,
  },
});
