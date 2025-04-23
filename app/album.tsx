import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, Modal, ScrollView } from 'react-native';
import { Searchbar, List, IconButton, Button, TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';

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

export default function Album() {
    const { id } = useLocalSearchParams();
    const { token, currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [album, setAlbum] = useState<any>(null);
    const [tracks, setTracks] = useState<SpotifyTrack[]>([]);

    useEffect(() => {
        const fetchAlbum = async () => {
            if (!id) return;
            try{
        const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAlbum(data);
        setTracks(data.tracks.items);
        } catch (error) {
            console.error('Error fetching album:', error);
        } finally {
            setLoading(false);
        }
    }; 
    fetchAlbum();
    }, [id, token]);


    return (
        <ThemedView style={styles.overall}>
            <ScrollView style={styles.scrollContainer}>
                {album && (
                    <View style={styles.header}>
                    <Text style={styles.albumTitle}>{album.name}</Text>
                    <Image source={{ uri: album.images[0]?.url }} style={styles.cover} />
                    <Text style={styles.artist}>{album.artists.map((a: any) => a.name).join(', ')}</Text>
                    </View>
                )}

                <View>
                    {tracks.map((track) => (
                    <List.Item
                        key={track.id}
                        title={track.name}
                        description={track.artists.map(a => a.name).join(', ')}
                        titleStyle={styles.trackTitle}
                        descriptionStyle={styles.trackDesc}
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
                                }}

                            />
                        )}
                    />
                    ))}
                </View>
            </ScrollView>
        </ThemedView>
        );
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
                marginVertical: 30,
              },
              cover: {
                width: 200,
                height: 200,
                borderRadius: 8,
              },
              albumTitle: {
                fontWeight: 'bold',
                color: 'white',
                fontSize: 35,
                alignItems: 'center',
                justifyContent: 'center',
                width: '80%'
              },
              artist: {
                color: 'grey',
                marginTop: 4,
                textAlign: 'center',
              },
              trackTitle: {
                color: 'white',
              },
              trackDesc: {
                color: 'grey',
              },
              addIcon: {
                marginRight: 2,
              },

});
