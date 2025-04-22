import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, FlatList, Pressable, Button } from 'react-native';
import { Text, ActivityIndicator, IconButton, Modal, Searchbar, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { database } from './config/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import { Playlist, Song, UserRef } from '@/types';

// Local type for Spotify track search results
type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { 
    name: string;
    images: { url: string }[] 
  };
  uri: string;
  duration_ms: number;
};

// covers random punctuation cases when converting
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\(\)]/g, "-") // replace ( and ) with -
    .replace(/\s*-\s*/g, "-") // unify spacing around hyphens
    .replace(/\s+/g, " ") // normalize spaces
    .trim();
}

// used as input to converter functions
type SongMatchInput = {
  name: string;
  artists: string[];
  durationMs: number;
  token: string;
};

// takes name artists, and duration as input and returns the best Apple Music match or null if no matches
export async function getBestAppleMusicMatch({
  name,
  artists,
  durationMs,
  token,
}: SongMatchInput): Promise<string | null> {
  const storefront = "us";
  const searchTerm = encodeURIComponent(`${name} ${artists.join(" ")}`);
  const url = `https://api.music.apple.com/v1/catalog/${storefront}/search?term=${searchTerm}&types=songs&limit=10`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error("Apple Music API error:", response.statusText);
    return null;
  }

  const data = await response.json();
  const songs = data.results?.songs?.data;
  console.log("Tracks returned:", songs?.length);
  if (!songs || songs.length === 0) return null;

  const inputArtistsLower = artists.map((a) => a.toLowerCase().trim());
  const normalizedInputName = normalizeTitle(name);

  let bestMatch: { id: string; score: number } | null = null;

  for (const song of songs) {
    const songName = song.attributes.name;
    const songArtist = song.attributes.artistName.toLowerCase();
    const songDurationMs = song.attributes.durationInMillis;

    const normalizedSongName = normalizeTitle(songName);
    const songArtists = songArtist
      .split(/,|&|feat\.|featuring|\+|with/i)
      .map((a: string) => a.trim())
      .filter((a: string | any[]) => a.length > 0);

    const nameMatch =
      normalizedSongName.includes(normalizedInputName) ||
      normalizedInputName.includes(normalizedSongName);

    const matchingArtistCount = inputArtistsLower.filter((inputArtist) =>
      songArtists.includes(inputArtist)
    ).length;

    const artistCountMatch =
      Math.abs(songArtists.length - inputArtistsLower.length) <= 1;

    const durationDiff = Math.abs(songDurationMs - durationMs) / 1000;

    console.log("Checking track:", {
      songName,
      songArtists,
      songDurationMs,
      nameMatch,
      matchingArtistCount,
      durationDiff,
      artistCountMatch,
    });

    if (nameMatch && matchingArtistCount > 0 && artistCountMatch) {
      const score = matchingArtistCount * 10 + (15 - durationDiff);
      console.log("Track is a viable match. Score:", score);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { id: song.id, score };
      }
    }
  }

  console.log("Best Match:", bestMatch);
  return bestMatch?.id ?? null;
}

// takes name artists, and duration as input and returns the best Spotify match or null if no matches
export async function getBestSpotifyMatch({
  name,
  artists,
  durationMs,
  token,
}: SongMatchInput): Promise<string | null> {
  const searchTerm = encodeURIComponent(`${name} ${artists.join(" ")}`);
  const url = `https://api.spotify.com/v1/search?q=${searchTerm}&type=track&limit=10`;

  console.log("Spotify Search URL:", url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error("Spotify API error:", response.statusText);
    return null;
  }

  const data = await response.json();
  const tracks = data.tracks?.items;
  console.log("Tracks returned:", tracks?.length);
  if (!tracks || tracks.length === 0) return null;

  const inputArtistsLower = artists.map((a) => a.toLowerCase().trim());

  let bestMatch: { id: string; score: number } | null = null;

  for (const track of tracks) {
    const trackName = track.name.toLowerCase();
    const trackArtists = track.artists.map((a: any) => a.name.toLowerCase());
    const normalizedInputName = normalizeTitle(name);
    const normalizedTrackName = normalizeTitle(trackName);
    const trackDurationMs = track.duration_ms;

    const nameMatch =
      normalizedTrackName.includes(normalizedInputName) ||
      normalizedInputName.includes(normalizedTrackName);
    const matchingArtistCount = inputArtistsLower.filter((inputArtist) =>
      trackArtists.includes(inputArtist)
    ).length;
    const artistCountMatch =
      Math.abs(trackArtists.length - inputArtistsLower.length) <= 1;
    const durationDiff = Math.abs(trackDurationMs - durationMs) / 1000;

    console.log("Checking track:", {
      name: track.name,
      trackArtists,
      trackDurationMs,
      nameMatch,
      matchingArtistCount,
      durationDiff,
      artistCountMatch,
    });

    if (nameMatch && matchingArtistCount > 0 && artistCountMatch) {
      const score = matchingArtistCount * 10 + (5 - durationDiff);
      console.log("Track is a viable match. Score:", score);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { id: track.id, score };
      }
    }
  }

  console.log("Best Match:", bestMatch);
  return bestMatch?.id ?? null;
}

export default function PlaylistScreen() {
  const router = useRouter();
  const { currentUser, token } = useAuth();
  const { id: playlistId } = useLocalSearchParams();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Search modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Load Playlist from Firebase
  useEffect(() => {
    if (!playlistId) return;
    const playlistRef = ref(database, `playlists/${playlistId}`);
    const unsubscribe = onValue(
      playlistRef,
      (snapshot) => {
        const data = snapshot.val();
        setPlaylist(data ? (data as Playlist) : null);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading playlist:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [playlistId]);

  // Fetch Spotify tracks for search
  useEffect(() => {
    const fetchTracks = async () => {
      if (!token || searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (res.ok && data.tracks?.items) {
          setSearchResults(
            data.tracks.items.map((t: any) => ({
              id: t.id,
              name: t.name,
              artists: t.artists,
              album: t.album,
              uri: t.uri,
              duration_ms: t.duration_ms,
            }))
          );
        } else {
          console.error('Search error:', data);
        }
      } catch (e) {
        console.error('Search fetch error:', e);
      } finally {
        setSearchLoading(false);
      }
    };
    const timeout = setTimeout(fetchTracks, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, token]);

  const testMatch = async () => {
    try {
      const result = await getBestAppleMusicMatch({
        name: "Pink Pony Club",
        artists: ["Chappell Roan"],
        durationMs: 258000,
        token: 'redacted',
      });
      console.log("token:", token)

      console.log("Spotify Match Result:", result);
    } catch (err) {
      console.error("Error in testMatch:", err);
    }
  };

  // Add selected track to playlist
  const selectTrack = async (track: SpotifyTrack) => {
    if (!playlistId || !currentUser || !playlist) return;

    const isDuplicate = playlist.songs?.some(s => s.spotify_id === track.id);
    if (isDuplicate) {
      console.log('Song already exists in playlist');
      return;
    }

    const newSong: Song = {
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name ?? '',
      duration_ms: track.duration_ms,
      cover_art: track.album.images[0]?.url ?? '',
      spotify_id: track.id,
      spotify_uri: track.uri,
    };

    const updatedSongs = [...(playlist.songs || []), newSong];

    await set(ref(database, `playlists/${playlistId}/songs`), updatedSongs);
    setModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // const renderTrackItem = ({ item }: { item: any }) => {
  //   const track = item.track;
  //   if (!track) return null;

  //   return (
  //     <View style={styles.trackItem}>
  //       <Image
  //         source={{ uri: track.album.images?.[0]?.url }}
  //         style={styles.trackImage}
  //       />
  //       <View style={styles.trackInfo}>
  //         <Text style={styles.trackName}>{track.name}</Text>
  //         <Text style={styles.trackArtist}>
  //           {track.artists?.map((artist: any) => artist.name).join(', ')}
  //         </Text>
  //       </View>
  //     </View>
  //   );
  // };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
      </ThemedView>
    );
  }

  if (!playlist) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Text>Playlist not found.</Text>
      </ThemedView>
    );
  }

  const toggleExport = () => {

  }

  return (
    <ThemedView style={styles.overall}>
      <View style={styles.headerContainer}>
      <Button title="Test Spotify Match" onPress={testMatch} />
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
        {playlist.cover_art && (
          <Image
            source={
              typeof playlist.cover_art === 'string'
                ? { uri: playlist.cover_art }
                : playlist.cover_art
            }
            style={styles.coverImage}
          />
        )}
        <View>
          <Text style={styles.owner}>
            Owner: { (playlist.owner as UserRef).name }
            {/* Harmonizers: {playlist.owner?.display_name || 'Unknown'} */}
          </Text>
          {playlist.description ? (
            <Text style={styles.description}>{playlist.description}</Text>
          ) : null} 
        </View>

        <Pressable onPress={() => router.push('/friends')}>
          <Text style={styles.export}>Export</Text>
        </Pressable>

      </View>
      
      <FlatList
        data={playlist.songs}
        keyExtractor={(item, index) => `${item.spotify_id}_${index}`}
        contentContainerStyle={styles.trackList}
        renderItem={({ item }) => (
          <View style={styles.trackItem}>
            {item.cover_art ? (
              <Image source={{ uri: item.cover_art }} style={styles.trackImage} />
            ) : null}
            <View style={styles.trackInfo}>
              <Text style={styles.trackName}>{item.name}</Text>
              <Text style={styles.trackArtist}>{item.artist}</Text>
            </View>
          </View>
        )}
      />
      {/*Potential Edit Playlist Button (Options to remove song etc))}
      {/* <IconButton
        icon="pencil-circle"
        size={40}
        onPress={showPopup}
        style={styles.editIcon}
        iconColor="black"
      /> */}
      {/* Add Song Button */}
      <IconButton
        icon="plus-circle-outline"
        size={40}
        style={styles.addIcon}
        onPress={() => setModalVisible(true)}
      />
      {/* Search & Add Modal */}
      <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)}>
        <View style={styles.modalContent}>
          <Searchbar
            placeholder="Search Spotify tracks"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchbar}
          />
          {searchLoading ? (
            <ActivityIndicator animating size="small" />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={t => t.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <List.Item
                  title={item.name}
                  description={item.artists.map(a => a.name).join(', ')}
                  left={() => (
                    <Image source={{ uri: item.album.images[0]?.url }} style={styles.thumbnail} />
                  )}
                  onPress={() => selectTrack(item)}
                />
              )}
            />
          )}
          <IconButton icon="close" size={30} onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
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
  description: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'regular',
    marginBottom: 20,
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
  editIcon: {
    right: 10,
    bottom: 75,
    position: 'absolute',
    justifyContent: 'flex-start',
  },
   addIcon: { 
    position: 'absolute', 
    right: 20, 
    bottom: 20 
  },
   modalContent: { 
    backgroundColor: 'white', 
    padding: 20, 
    margin: 20, 
    borderRadius: 8 
  },
   searchbar: { 
    marginBottom: 10 
  },
   thumbnail: { 
    width: 40, 
    height: 40, 
    borderRadius: 4, 
    marginRight: 8 
  },
});
