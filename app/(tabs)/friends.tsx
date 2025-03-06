import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Avatar} from 'react-native-paper';

export default function TabTwoScreen() {
  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        FRIENDS
      </Text>
    <Avatar.Image style={styles.icon} size={70} source={require('../../assets/images/avatar.png')} />
    </ThemedView>
  );
}

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
    top: 200,
    left: 25
  }
});