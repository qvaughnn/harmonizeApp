import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Avatar} from 'react-native-paper';

const Profile = () => {
  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        PROFILE
      </Text>
      <Avatar.Image style={styles.icon} size={180} source={require('../../assets/images/avatar.png')} />
      <Text variant="headlineSmall">@username</Text>
      <Button
        style={styles.updateButton}
        mode="elevated"
        labelStyle={{ color: 'black', fontWeight: 'bold', fontSize:15, }}>
          Update Profile Picture
      </Button>
      <Button
        icon="close"
        style={styles.logOutButton}
        mode="elevated"
        labelStyle={{ color: 'black', fontWeight: 'bold', fontSize:15, }}>
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
  updateButton:{
    backgroundColor: '#d7acfc',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: 30, // Fully rounded button
    elevation: 5, // Adds shadow on Android
    shadowColor: 'black', // Shadow color for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginVertical: 6,
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
  },
});
