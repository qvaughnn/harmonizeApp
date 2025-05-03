import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, Modal, ScrollView, FlatList } from 'react-native';
import { Searchbar, List, IconButton, Button, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ref, onValue, set, push, get } from 'firebase/database';
import { database } from './config/firebase';
import { Playlist, PlaylistPreview, Song, UserRef } from '@/types';

type Album = {
    id: string;
    name: string;
    release_date: string;
    images: { url: string }[];
};

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


export default function Artist() {
    const { id } = useLocalSearchParams();
    const { token } = useAuth();
    const [artist, setArtist] = useState<any>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [topTracks, setTopTracks] = useState<any>(null);
    const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
    const [playlistModal, setPlaylistModal] = useState(false);

    useEffect(() => {
        const fetchArtist = async () => {
            if (!id || !token) return;
            try {
                const artistRes = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const artistData = await artistRes.json();
                setArtist(artistData);

                const albumsRes = await fetch(`https://api.spotify.com/v1/artists/${id}/albums`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const albumsData = await albumsRes.json();
                setAlbums(albumsData.items);

                const topTracksRes = await fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const topTracksData = await topTracksRes.json();
                setTopTracks(topTracksData.tracks);

            } catch (error) {
                console.error('Error fetching artist data:', error);
            } finally {
                setLoading(false);
            }
        }; fetchArtist();
    }, [id, token]);

    const openPicker = (item: SpotifyTrack) => {
        setSelectedTrack(item);
        setPlaylistModal(true);
      };
      

    return(
        <ThemedView style={styles.overall}>
            <ScrollView style = {styles.scrollContainer}>
                {artist && (
                    <View style = {styles.header}>
                        <View style={styles.headerRow}>
                            <IconButton
                                icon="arrow-left"
                                iconColor='grey'
                                size={30}
                                onPress={() => router.back()}
                            />
                            <Text style = {styles.artistName}> {artist.name}</Text>
                        </View>
                        {artist.images && artist.images[0] && (
                            <Image source={{ uri: artist.images[0].url }} style={styles.artistImage} />
                        )}
                    </View>
                )}
                {/* displays the artists top tracks */}
                <Text style = {styles.albumContainer}>Popular Songs</Text>
                {topTracks?.slice(0, 3).map((track: any) => (
                    <List.Item
                        key={track.id}
                        title={track.name}
                        titleStyle={{color: 'white'}}
                        right={props => (
                            <IconButton
                                {...props}
                                icon="plus-circle-outline"
                                size={24}
                                style={styles.addIcon}
                                iconColor="white"
                                onPress={() => {
                                // Handle add song to playlist
                                console.log(`Adding track: ${track.name}`); 
                                openPicker(track)
                                }}
                        
                            />
                        )}
                        left={() => (
                        <Image
                            source={{ uri: track.album.images[0].url }}
                            style={styles.albumImage}
                        />
                        )}
                    />
                    ))}

                {/* displays all of the artists albums */}
                <Text style = {styles.albumContainer}>Albums</Text>
                {albums.map((album) => (
                    <List.Item
                        key={album.id}
                        title={album.name}
                        titleStyle={styles.albumTitle}
                        description={album.release_date.slice(0, 4)}
                        descriptionStyle={{ color: 'white' }}
                        left={() => (
                            <Image
                                source={{ uri: album.images?.[0]?.url }}
                                style={styles.albumImage}
                            />
                        )}
                        onPress={() => router.push({ pathname: '/album', params: { id: album.id } })} 
                    />
                ))}
            </ScrollView>
        </ThemedView>
    )
}
    const styles = StyleSheet.create({
        overall: {
            flex: 1,
            alignItems: 'center',
            paddingTop: 60,
            justifyContent: 'flex-start',
          },
          scrollContainer: {
            paddingHorizontal: 20,
            paddingBottom:40,
            width: '100%',
          },
          header: {
            alignItems: 'center',
            marginBottom: 30,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            marginBottom: 20,
        },
        artistName: {
            fontWeight: 'bold',
            color: 'white',
            fontSize: 30,
            marginLeft: 10,
        },
        artistImage:{
            width: 200,
            height: 200,
            marginBottom: 10,
        },
        albumContainer:{
            fontWeight: 'bold',
            color: 'white',
            fontSize: 24,
            marginBottom: 10,
        },
        albumImage: {
            width: 50,
            height: 50,
            borderRadius: 4,
            marginRight: 10,
        },
        albumTitle:{
            fontWeight: 'bold',
            color: 'white',
            fontSize: 18,
        },
        addIcon: {
            marginRight: 2,
        },
    });
    

