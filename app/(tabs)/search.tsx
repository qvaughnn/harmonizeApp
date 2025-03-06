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

    <Searchbar
      placeholder="Search Playlists, Friends, and Songs"
      value={searchQuery}
      onChangeText={handleSearchQueryChange}
      style={styles.searchbar}
    />
    <Text variant="displayMedium" style={styles.subtitle}>
        Recent Searches
      </Text>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overall: {
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
    marginBottom: 10,
  },
  searchbar: {
    width: '90%',
    marginTop: -410,
    marginBottom: 20,
    alignSelf: 'center',
  },
  subtitle: {
    color: 'darkgrey',
    fontWeight: 'normal',
    fontSize: 18,
    textAlign: 'left',
    left: 25, 
  },

});
