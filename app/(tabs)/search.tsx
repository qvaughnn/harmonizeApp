import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text , TextInput, Button, Searchbar } from 'react-native-paper';
import * as React from 'react';


export default function TabTwoScreen() {
 const [searchQuery, setSearchQuery] = React.useState('');


 function handleSearchQueryChange(query: string): void {
   setSearchQuery(query);
 }
 return (
   <ThemedView style={styles.overall}>
     <Text variant="displayMedium" style={styles.title}>
       SEARCH
     </Text>


   <View style = {styles.searchContainer}>
           <Searchbar
             placeholder="Search Playlists, Friends, and Songs"
             value={searchQuery}
             onChangeText={handleSearchQueryChange}
             style={styles.searchbar}
           />
         </View>
   <View style={styles.subtitleContainer}>
     <Text variant="displayMedium" style={styles.subtitle}>
         Recent Searches
       </Text>
   </View>
   </ThemedView>
 );
}


const styles = StyleSheet.create({
 overall: {
   alignItems: 'center',
   flex:1,
   justifyContent: 'flex-start',
   paddingTop: 60,
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
   marginBottom: 20,
 },
 subtitleContainer: {
   width: '100%',
   paddingLeft: 25,
 },
 subtitle: {
   color: 'darkgrey',
   fontWeight: 'normal',
   fontSize: 18,
   textAlign: 'left'
 },


});
