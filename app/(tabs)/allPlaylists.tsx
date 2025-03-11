import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Searchbar } from 'react-native-paper';
import React from 'react';
import { getAuth, signInAnonymously } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";

const allPlaylists = () =>{

  const { token, setToken } = useAuth(); 
  const [searchQuery, setSearchQuery] = React.useState('');
  
  function handleSearchQueryChange(query: string): void {
    setSearchQuery(query);
  }
 return (
   <ThemedView style={styles.overall}>
     <Text variant="displayMedium" style={styles.title}>
       PLAYLISTS
     </Text>
     <View style = {styles.searchContainer}>
       <Searchbar
               placeholder="Search Playlists"
               value={searchQuery}
               onChangeText={handleSearchQueryChange}
               style={styles.searchbar}
         />
     </View>
   </ThemedView>
 );
}

export default allPlaylists;

const styles = StyleSheet.create({
 overall: {
   alignItems: 'center',
   flex:1,
   paddingTop: 60,
   justifyContent: 'flex-start'
 },
 title:{
   fontWeight: 'bold',
   color: 'darkgrey',
   position: 'absolute',
   top: 80,
   left: 25,
   justifyContent: 'flex-start',
 },
 searchContainer:{
   marginTop:100,
   width: '90%'
 },
 searchbar: {
   width: '100%',
   marginBottom: 30,
 },
});
