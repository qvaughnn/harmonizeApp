import { Image, StyleSheet, Platform, View, Text, TextInput, ImageBackground, Pressable } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ImageBackground
      source={require('@/assets/images/background.webp')}
      style={styles.background}
    >
      <View style={styles.overall}>
      <Image
          source={require('@/assets/images/logo.png')}
          style={styles.reactLogo}
      />
      <Text style={styles.title}>
        Log in to continue.
      </Text>
      <TextInput
        style={styles.login}
        placeholder="Username"
      />
      <TextInput
        style={styles.login}
        placeholder="Password"
      />
      <Pressable style={styles.submitButton}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </Pressable>
      <Text>Or</Text>
      <Pressable style={styles.spotifyButton}>
        <Text style={styles.spotifyButtonText}>LOG IN WITH SPOTIFY</Text>
      </Pressable>
      <Pressable style={styles.appleButton}>
        <Text style={styles.appleButtonText}>LOG IN WITH APPLE MUSIC</Text>
      </Pressable>
      <Text>Don't have an account? SIGN UP</Text>
    </View>
    </ImageBackground>
    
  );
}

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
  },
  reactLogo: {
    height: 270,
    width: 400,
    bottom: 0,
    left: 0,
  },
  login: {
    height: 40,
    borderColor: 'black',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    marginVertical: 20,
    width: '50%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold', 
    marginVertical: 20,
    color: 'white',
  },
  background: {
    flex:1,
  },
  submitButton: {
    backgroundColor: '#4B0082', // Purple color
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: '#800080', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: 'white'
  },
  spotifyButton: {
    backgroundColor: 'green', // Purple color
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'green', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  spotifyButtonText: {
    color: 'white'
  },
  appleButton: {
    backgroundColor: 'gray', // Purple color
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'gray', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  appleButtonText: {
    color: 'white'
  },
});
