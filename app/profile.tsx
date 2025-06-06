import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Avatar} from 'react-native-paper';
import { useState, useEffect, useContext } from 'react';
import { useAuth } from '../contexts/AuthContext'; 
import { useMusicService } from '../contexts/MusicServiceContext';
import { useRouter } from 'expo-router';

const Profile = () => {
  const { token, setToken, currentUser } = useAuth(); 
  const [userData, setUserData] = useState<any>(null);
  const { musicService } = useMusicService();
  const { setMusicService } = useMusicService();
  const router = useRouter();


  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else if (musicService === 'AppleMusic') {
      fetchAppleMusicProfile();
    }
  }, [token, musicService]);

  const fetchUserProfile = async () => {
    console.log("fetchUserProfile() called");
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("This is a RESPONSE: ", response);
      const data = await response.json();

      if (response.ok) {
        setUserData(data);
      } else {
        console.error("Error fetching profile:", data);
      }
    } catch (error) {
      console.error("User profile fetch error:", error);
    }
  };

  const fetchAppleMusicProfile = async () => {
    try {
      console.log("Username : ", currentUser.name);
      setUserData({
        display_name: currentUser.name,
        images: ['../assets/images/appleLogo.png'],
      });
    } catch (error) {
      console.error("Apple Music profile fetch error:", error);
    }
  };
  
  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        PROFILE
      </Text>
      {/* <Avatar.Image style={styles.icon} size={180} source={require('../assets/images/avatar.png')} /> */}
      <Avatar.Image
        style={styles.icon}
        size={180}
        source={userData?.images?.[0]?.url ? { uri: userData.images[0].url } : require('../assets/images/avatar.png')}
      />
      <Text style={styles.username} variant="headlineMedium">@{userData?.display_name || currentUser.name}</Text>
      <Button
        icon="plus"
        style={styles.importButton}
        mode="elevated"
        labelStyle={{ color: 'black', fontWeight: 'bold', fontSize:15, }}
        onPress={() => {
          router.replace('/playlistImport');
        }}
      >
          Import Playlist
      </Button>
      <Button
        icon="close"
        style={styles.logOutButton}
        mode="elevated"
        labelStyle={{ color: 'black', fontWeight: 'bold', fontSize:15, }}
        onPress={() => {
          setToken(null); // Clear auth token
          setMusicService('Spotify'); // Reset music service
          router.replace('/'); // Navigate to login screen
        }}
      >
          Log Out
      </Button>
    </ThemedView>
  );
}

export default Profile;

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
    flex:1,
    justifyContent: 'center',
  },
  title:{
    color:'darkgrey',
    position: 'absolute',
    top: 80,
    left: 25,
    justifyContent: 'flex-start',
    fontWeight: 'bold',
  },
  icon:{
    position: 'absolute',
    top: 160,
  },
  username:{
    position: 'absolute',
    top: 350,
    color: 'white',
  },
  importButton:{
    backgroundColor: 'grey',
    position: 'absolute',

  },
  logOutButton:{
    backgroundColor: 'grey',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'black', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginVertical: 6,
    top: 70,
  },
});
