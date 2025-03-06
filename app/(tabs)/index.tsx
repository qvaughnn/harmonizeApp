import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button } from 'react-native-paper';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.overall}>
      <Image
          source={require('@/assets/images/logoTest.png')}
          style={styles.reactLogo}
      />
      {/* <Text variant="headlineLarge" style={styles.title}>
        Log in to continue
      </Text> */}
      <Button 
        icon={() => <Image style={styles.spotifyLogo} source={require('@/assets/images/spotifyLogo.png')}></Image>} 
        style={styles.spotifyButton} 
        mode="elevated"
        labelStyle={{ color: 'white', fontWeight: 'bold', fontSize:20, }}>
          LOG IN WITH SPOTIFY
      </Button>
      <Button 
        icon={() => <Image style={styles.appleLogo} source={require('@/assets/images/appleLogo.png')}></Image>} 
        style={styles.appleButton} 
        mode="elevated"
        labelStyle={{ color: 'black', fontWeight: 'bold', fontSize:17, }}>
          LOG IN WITH APPLE MUSIC
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
    flex:1,
    justifyContent: 'center',
  },
  reactLogo: {
    height: 330,
    width: 800,
    bottom: 0,
    left: 0,
    marginVertical: 20,
    resizeMode: 'contain'
  },
  title: {
    color: 'white',
  },
  spotifyButton: {
    backgroundColor: '#1BB954',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'black', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginVertical: 20,
  },
  appleButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'black', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginVertical: 20,
  },
  spotifyLogo: {
    height:40,
    width:40
  },
  appleLogo:{
    height:30,
    width:30,
    resizeMode: 'contain'
  }
});
