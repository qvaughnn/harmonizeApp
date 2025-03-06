import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Avatar} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Profile from './profile';

export default function TabTwoScreen() {

  const navigation = useNavigation();

  const handleUserPress = () => {
    // navigation.navigate('Profile');
  };

  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style = {styles.title}>
        HARMONIZE
      </Text>
      
      <Pressable style={styles.icon} onPress={handleUserPress}>
        <Avatar.Image size={50} source={require('../../assets/images/avatar.png')} />
      </Pressable>

      <Text variant="headlineMedium" style = {styles.subtitle}>
        PLAYLISTS
      </Text>
      <Text style = {styles.view}>
        View all
      </Text>
      <Text variant="headlineMedium" style = {styles.subtitle2}>
        FREINDS
      </Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
    flex:1,
    // justifyContent: 'center',
  },
  title: {
    // marginVertical: 80,
    // marginLeft: 20,
    fontWeight: 'bold',
    color: 'darkgrey',
    position: 'absolute',
    top: 80,
    left: 25,
    justifyContent: 'flex-start',
  },
  subtitle: {
    // marginLeft: 20,
    // fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    position: 'absolute',
    top: 170,
    left: 25,
    justifyContent: 'flex-start',
  },
  subtitle2: {
    // marginLeft: 20,
    // fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    position: 'absolute',
    top: 500,
    left: 25,
    justifyContent: 'flex-start',
  },
  view: {
    fontWeight: 'medium',
    color: 'white',
    position: 'absolute',
    top: 170,
    right: 25,
    justifyContent: 'flex-start',
    fontSize: 15,
    // marginVertical: -20,
    // marginRight: 20,
    // textAlign: 'right',
  },
  icon:{
    position: 'absolute',
    justifyContent: 'flex-start',
    right: 20,
    top: 80,
  },
});

