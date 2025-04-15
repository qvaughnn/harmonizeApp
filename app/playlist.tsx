import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, Divider, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { app, database } from "./config/firebase";
import { ref, set, onValue, get, child, push, DatabaseReference, query, orderByChild, equalTo, DataSnapshot } from "firebase/database";

interface Playlist {
  name: string;
  author: string;
  songs: string[];
}

// creates a new playlist with the given name, author, and image and returns the key of the new playlist
async function createPlaylist(name: string, author: string, image: string): Promise<string | null> {
  const playlistsRef = ref(database, "playlists");

  // generates unique id for playlist
  const newPlaylistRef = push(playlistsRef);

  const playlistData = {
    name: name,
    author: author,
    image: image,
    // can add more fields later
  }

  // Set the playlist data at the new location
  set(newPlaylistRef, playlistData)
    .then(() => {
      console.log("Playlist added successfully with ID: ", newPlaylistRef.key);
    })
    .catch((error) => {
      console.error("Error adding playlist: ", error);
    });

  return newPlaylistRef.key;
}

// adds song to given playlist, only takes spotify id for now
async function addSong(playlistRef: string, spotifyId: string) {
  const songsRef = ref(database, `playlists/${playlistRef}/songs/spotify`)

  // generates unique id for song
  const newSongRef = push(songsRef);

  const songData = {
    spotifyId: spotifyId, 
    // can add more data if we want later
  }

  // Set the playlist data at the new location
  set(newSongRef, songData)
    .then(() => {
      console.log("Song added successfully with ID: ", newSongRef.key);
    })
    .catch((error) => {
      console.error("Error adding song: ", error);
    });
}

// gets all playlists by user and returns them as an array of key strings
async function getPlaylistIdsByAuthor(userId: string): Promise<string[]> {
  const playlistsRef = ref(database, "playlists")

  // Create a query to filter playlists by author
  const playlistsByAuthorQuery = query(
    playlistsRef,
    orderByChild('author'),
    equalTo(userId)
  );

  try {
    const snapshot: DataSnapshot = await get(playlistsByAuthorQuery);

    const playlistIds: string[] = [];
    snapshot.forEach((childSnapshot) => {
      playlistIds.push(childSnapshot.key as string); // Just get the key (ID)
    });

    return playlistIds;
  } catch (error) {
    console.error("Error getting playlist IDs by author: ", error);
    return [];
  }
}

// gets playlist info given id and returns a Playlist (see interface at top)
async function getPlaylistInfo(playlistId: string): Promise<Playlist | null> {
  const playlistRef = ref(database, `playlists/${playlistId}`); // Reference to the specific playlist

  try {
    const snapshot: DataSnapshot = await get(playlistRef);

    if (snapshot.exists()) {
      const playlistData = snapshot.val() as Playlist; // Type assertion to Playlist
      return playlistData;
    } else {
      console.log("Playlist not found with ID:", playlistId);
      return null; // Playlist not found
    }
  } catch (error) {
    console.error("Error getting playlist info: ", error);
    return null; // Return null in case of an error
  }
}

export default function PlaylistScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { id: playlistId } = useLocalSearchParams();

  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [visible, setVisible] = useState(false);

  const showPopup = () => setVisible(true);

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
    const track = item.track;
    if (!track) return null;

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

  const toggleExport = () => {

  }

  return (
    <ThemedView style={styles.overall}>
      <View style={styles.headerContainer}>
        <IconButton
          icon="arrow-left"
          size={30}
          onPress={() => router.back()}
          style={styles.backButton}
          iconColor="grey"
        />
        <Text style={styles.playlistTitle}>
          {playlist.name}
        </Text>
      </View>

      <View style={styles.coverContainer}>
        {playlist.images && playlist.images[0] && (
          <Image
            source={{ uri: playlist.images[0].url }}
            style={styles.coverImage}
          />
        )}
        <View>
          <Text style={styles.owner}>
            Harmonizer: {playlist.owner?.display_name || 'Unknown'}
          </Text>
          {/* {playlist.description ? (
            <Text style={styles.description}>{playlist.description}</Text>
          ) : null} */}
        </View>

        <Pressable onPress={() => router.push('/friends')}>
          <Text style={styles.export}>Export</Text>
        </Pressable>

      </View>

      <FlatList
        data={playlist.tracks?.items || []}
        renderItem={renderTrackItem}
        keyExtractor={(item, index) => item.track?.id || String(index)}
        contentContainerStyle={styles.trackList}
      />

      {/* <IconButton
                    icon="pencil-circle"
                    size={40}
                    onPress={showPopup}
                    style={styles.addIcon}
                    iconColor="white"
                  /> */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overall: {
    flex: 1,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
  },
  backButton: {
    // marginLeft: 10,
  },
  playlistTitle: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 35,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%'
  },
  coverContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  coverImage: {
    width: 220,
    height: 220,
    borderRadius: 5,
    marginVertical: 12,
    resizeMode: 'contain'
  },
  owner: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  export: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'regular',
    marginBottom: 20,
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
  addIcon: {
    right: 10,
    bottom: 75,
    position: 'absolute',
    justifyContent: 'flex-start',
   },
});
