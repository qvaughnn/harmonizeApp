import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, FlatList, Pressable, Button } from 'react-native';
import { Text, ActivityIndicator, IconButton, Modal, Searchbar, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { database } from './config/firebase';
import { ref, onValue, set, get, update } from 'firebase/database';
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

// Export given playlist to Apple Music
async function exportToAppleMusic(playlistId: string, developerToken: string, musicUserToken: string): Promise<string[]> {
  try {
    console.log('Exporting playlist to Apple Music:', playlistId);
    const playlistRef = ref(database, `playlists/${playlistId}`);
    const snapshot = await get(playlistRef);

    const playlistSongsRef = ref(database, `playlists/${playlistId}/songs`);
    const snapshotSongs = await get(playlistSongsRef);

    if (!snapshot.exists()) {
      console.error('Playlist not found');
      return [];
    }

    // Create a new empty Apple Music playlist
    const newPlaylistId = await createAppleMusicPlaylist(
      developerToken,
      musicUserToken,
      snapshot.val().name,
      snapshot.val().description,
    );

    const songsData = snapshotSongs.val();

    let songIds: string[] = [];
    let missingSongs: string[] = [];

    for (const [songKey, song] of Object.entries(songsData)) {
      console.log('Song number (key):', songKey);
      console.log('Song data:', song);

      if (song && (song as any).apple_music_id) {
        songIds.push((song as any).apple_music_id);
      } else {
        const bestMatch = await getBestAppleMusicMatch({
          name: (song as any).name,
          artists: (song as any).artist.split(', '),
          durationMs: (song as any).duration_ms,
          token: developerToken, // use **developer token** here
        });

        if (bestMatch) {
          songIds.push(bestMatch);
          console.log('Best match found for Apple Music:', bestMatch);

          const newSongRef = ref(database, `playlists/${playlistId}/songs/${songKey}`);
          await update(newSongRef, {
            apple_music_id: bestMatch,
          }); // Update the song with the Apple Music ID
        } else {
          missingSongs.push(`${(song as any).name} - ${(song as any).artist}`);
          console.log('No match found for song:', (song as any).name);
        }
      }

      if (songIds.length > 99) {
        console.log('Adding tracks to Apple Music playlist:', songIds);
        await addTracksToAppleMusicPlaylist(developerToken, musicUserToken, newPlaylistId, songIds);
        songIds = []; // Reset after adding
      }
    }

    if (songIds.length > 0) {
      console.log('Adding remaining tracks to Apple Music playlist:', songIds);
      await addTracksToAppleMusicPlaylist(developerToken, musicUserToken, newPlaylistId, songIds);
    }

    console.log('The following songs were not found on Apple Music:', missingSongs.join(', '));
    return missingSongs;

  } catch (error) {
    console.error('Error exporting to Apple Music:', error);
    return [];
  }
}

async function createAppleMusicPlaylist(developerToken: string, musicUserToken: string, name: string, description: string = ''): Promise<string> {
  const url = `https://api.music.apple.com/v1/me/library/playlists`;

  const body = {
    attributes: {
      name: name,
      description: description,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': musicUserToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create Apple Music playlist: ${errorData.error?.message || errorData}`);
  }

  const data = await response.json();
  return data.data[0].id;
}

async function addTracksToAppleMusicPlaylist(developerToken: string, musicUserToken: string, playlistId: string, trackIds: string[]): Promise<void> {
  const url = `https://api.music.apple.com/v1/me/library/playlists/${playlistId}/tracks`;

  const body = {
    data: trackIds.map(id => ({
      id: id,
      type: "songs",
    })),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': musicUserToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to add tracks to Apple Music playlist: ${errorData.error?.message || errorData}`);
  }
}

// Export given playlist to Spotify and returns missing songs as an array of strings
async function exportToSpotify(playlist: string, token: string): Promise<string[]> {
  try {
    console.log('Exporting playlist:', playlist);
    const playlistRef = ref(database, `playlists/${playlist}`);
    const snapshot = await get(playlistRef);

    const playlistSongsRef = ref(database, `playlists/${playlist}/songs`);
    const snapshotSongs = await get(playlistSongsRef);

    if (!snapshot.exists()) {
      console.error('Playlist not found');
      return [];
    }

    let playlistId = await createSpotifyPlaylist(
      token,
      await getCurrentSpotifyUserId(token),
      snapshot.val().name,
      snapshot.val().description,
    )

    const songsData = snapshotSongs.val();

    let songUris: string[] = [];
    let missingSongs: string[] = [];
    for (const [songKey, song] of Object.entries(songsData)) {
      console.log('Song number (key):', songKey);
      console.log('Song data:', song);

      if (song && (song as any).spotify_uri) {
        songUris.push((song as any).spotify_uri);
      } else {
        const bestMatch = await getBestSpotifyMatch(
          (song as any).name,
          (song as any).artist.split(', '),
          (song as any).duration_ms,
          (song as any).album,
          token
        );

        if (bestMatch) {
          songUris.push(bestMatch);
          console.log('Best match found:', bestMatch);

          const newSongRef = ref(database, `playlists/${playlist}/songs/${songKey}`);
          await update(newSongRef, {
            spotify_uri: bestMatch,
          }); // Update the song with the Spotify URI

        } else {
          missingSongs.push(`${(song as any).name} - ${(song as any).artist}`);
          console.log('No match found for song:', (song as any).name);
        }
      }

      if (songUris.length > 99) {
        console.log('Adding tracks to Spotify playlist:', songUris);
        await addTracksToSpotifyPlaylist(token, playlistId, songUris);
        songUris = []; // Reset after adding
      }
    }

    if (songUris.length > 0) {
      console.log('Adding remaining tracks to Spotify playlist:', songUris);
      await addTracksToSpotifyPlaylist(token, playlistId, songUris);
    }

    console.log('The following songs were not found on Spotify:', missingSongs.join(', '));
    return missingSongs;

  } catch (error) {
    console.error('Error exporting to Spotify:', error);
    return [];
  }
}

// returns playlist id
async function createSpotifyPlaylist(
  accessToken: string,
  userId: string,
  playlistName: string,
  playlistDescription: string = '',
  isPublic: boolean = false
): Promise<any> {
  const url = `https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: playlistName,
      description: playlistDescription,
      public: isPublic,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create playlist: ${errorData.error.message}`);
  }

  const data = await response.json();
  return data.id;
}

async function addTracksToSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: trackUris,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to add tracks: ${errorData.error.message}`);
  }
}

async function getCurrentSpotifyUserId(accessToken: string): Promise<string> {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  const data = await response.json();
  return data.id;
}

// covers random punctuation cases when converting
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\(feat[^\)]*\)/gi, "") // remove (feat. XYZ)
    .replace(/\[feat[^\]]*\]/gi, "") // remove [feat. XYZ]
    .replace(/\(.*remix.*\)/gi, " remix") // turn (Lucian Remix) -> remix
    .replace(/-.*remix/gi, " remix")      // turn - Lucian Remix -> remix
    .replace(/[’']/g, "'")
    .replace(/[\(\)\[\]\{\}]/g, "-")
    .replace(/[^a-z0-9\s\-']/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
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

  const normalizedInputName = normalizeTitle(name);
  const normalizedInputArtists = artists.map((artist) => normalizeTitle(artist));

  let bestMatch: { id: string; score: number } | null = null;

  for (const song of songs) {
    const songName = song.attributes.name;
    const songArtist = song.attributes.artistName;
    const songAlbum = song.attributes.albumName ?? "";
    const songDurationMs = song.attributes.durationInMillis;

    const normalizedSongName = normalizeTitle(songName);
    const normalizedSongAlbum = normalizeTitle(songAlbum);
    const songArtists = normalizeTitle(songArtist)
      .split(/,|&|feat\.|featuring|\+|with/i)
      .map((a: string) => a.trim())
      .filter((a: string | any[]) => a.length > 0);

    const nameMatch = normalizedSongName === normalizedInputName;
    const artistOverlap = songArtists.filter((artist) => normalizedInputArtists.includes(artist)).length;
    const artistMatchRatio = artistOverlap / normalizedInputArtists.length;
    const durationDiffSec = Math.abs(songDurationMs - durationMs) / 1000;
    const albumMatch = normalizedSongAlbum.includes(normalizedInputName) || normalizedSongAlbum.includes(normalizedInputArtists[0]);
    const isCompilation = normalizedSongAlbum.includes("greatest hits") || normalizedSongAlbum.includes("compilation") || normalizedSongAlbum.includes("ultra");

    // Scoring
    let score = 0;
    if (nameMatch) score += 5;
    score += artistMatchRatio * 3;
    if (albumMatch) {
      score += 3;
    } else {
      score -= 1;
    }
    if (durationDiffSec <= 3) score += 1;
    if (durationDiffSec <= 1) score += 1;
    if (isCompilation) score -= 2;

    console.log("Checking track:", {
      songName,
      songArtists,
      songAlbum,
      songDurationMs,
      nameMatch,
      artistMatchRatio,
      albumMatch,
      durationDiffSec,
      isCompilation,
      score,
    });

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { id: song.id, score };
    }
  }

  if (bestMatch && bestMatch.score >= 6) {
    console.log("Selected best match with ID:", bestMatch.id);
    return bestMatch.id;
  } else {
    console.log("No reasonable Apple Music match found.");
    return null;
  }
}

// takes name artists, and duration as input and returns the best Spotify match or null if no matches
export async function getBestSpotifyMatch(
  name: string,
  artists: string[],
  durationMs: number,
  albumName: string,
  spotifyToken: string
): Promise<string | null> {

  const query = encodeURIComponent(`${name} ${artists.join(" ")}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${spotifyToken}`
      }
    });

    if (!response.ok) {
      console.error("Spotify search failed:", await response.text());
      return null;
    }

    const data = await response.json();
    const tracks = data.tracks?.items as any[];

    if (!tracks || tracks.length === 0) {
      console.log("No tracks found for query:", query);
      return null;
    }

    const normalizedName = normalizeTitle(name);
    const normalizedAlbum = normalizeTitle(albumName);
    const normalizedArtists = artists.map((artist) => normalizeTitle(artist));

    let bestMatch: { uri: string; score: number } | null = null;

    for (const track of tracks) {
      const trackName = normalizeTitle(track.name);
      const trackArtists = track.artists.map((artist: any) => normalizeTitle(artist.name));
      const trackAlbum = normalizeTitle(track.album?.name || "");
      const trackDurationMs = track.duration_ms;

      const nameMatch = trackName === normalizedName;
      const artistOverlap = trackArtists.filter((artist: string) => normalizedArtists.includes(artist)).length;
      const artistMatchRatio = artistOverlap / normalizedArtists.length;
      const durationDiffSec = Math.abs(trackDurationMs - durationMs) / 1000;
      const albumMatch = trackAlbum === normalizedAlbum;
      const isCompilation = track.album?.album_type === "compilation";

      // Scoring
      let score = 0;
      if (nameMatch) score += 5;
      score += artistMatchRatio * 3;
      if (albumMatch) {
        score += 3;
      } else {
        score -= 1;
      }
      if (durationDiffSec <= 3) score += 1;
      if (durationDiffSec <= 1) score += 1;
      if (isCompilation) score -= 2;

      console.log(`Track: ${track.name}`);
      console.log(`  URI: ${track.uri}`);
      console.log(`  nameMatch: ${nameMatch}`);
      console.log(`  artistMatchRatio: ${artistMatchRatio}`);
      console.log(`  albumMatch: ${albumMatch}`);
      console.log(`  durationDiffSec: ${durationDiffSec}`);
      console.log(`  score: ${score}`);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { uri: track.uri, score };
      }
    }

    // Require a **minimum score** to accept
    if (bestMatch && bestMatch.score >= 6) {
      console.log("Selected best match with URI:", bestMatch.uri);
      return bestMatch.uri;
    } else {
      console.log("No reasonable match found.");
      return null;
    }
  } catch (error) {
    console.error("Error during Spotify search:", error);
    return null;
  }
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
      const result = await getBestSpotifyMatch(
        "Pink Pony Club",
        ["Chappell Roan"],
        258000,
        "Pink Pony Club",
        token || '',
      );
      console.log("token:", token)

      console.log("Spotify Match Result:", result);
    } catch (err) {
      console.error("Error in testMatch:", err);
    }
  };

  const testExport = async () => {
    if (!playlistId || !token) return;

    try {
      // ✅ First, clear all spotify_id and spotify_uri fields
      const testPlaylist = '-OOzVqabOILUGvMNWy4x';
      const playlistSongsRef = ref(database, `playlists/${testPlaylist}/songs`);
      const snapshot = await get(playlistSongsRef);

      if (!snapshot.exists()) {
        console.error('Playlist not found');
        return;
      }

      const updates: { [key: string]: null } = {};

      for (const [songKey, song] of Object.entries(snapshot.val())) {
        if (song) {
          updates[`playlists/${testPlaylist}/songs/${songKey}/spotify_id`] = null;
          updates[`playlists/${testPlaylist}/songs/${songKey}/spotify_uri`] = null;
        }
      }

      await update(ref(database), updates);
      console.log("Cleared spotify_id and spotify_uri fields!");

      // ✅ Now run exportToSpotify AFTER clearing
      await exportToSpotify(testPlaylist, token);
      console.log("Export successful!");

    } catch (error) {
      console.error("Export failed:", error);
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
        <Button title="Test Spotify Match" onPress={testExport} />
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
            Owner: {(playlist.owner as UserRef).name}
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
