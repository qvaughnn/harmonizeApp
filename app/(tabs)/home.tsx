import { StyleSheet, Image, Platform, Text, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Fontisto } from '@expo/vector-icons';

export default function TabTwoScreen() {
  return (
    //<ParallaxScrollView>
    <View>
    
      <Text style = {styles.title}>
        HARMONIZE
      </Text>
      
      {/* insert profile photo in top right corner */}

      <Text style = {styles.subtitle}>
        Playlists
      </Text>

      <Text style = {styles.view}>
        View all
      </Text>
    </View>
    //</ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
  },

  title: {
    marginVertical: 80,
    marginLeft: 20,
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },

  subtitle: {
    marginLeft: 20,
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
  },

  view: {
    marginVertical: -20,
    fontSize: 15,
    marginRight: 20,
    fontWeight: 'medium',
    color: 'white',
    textAlign: 'right',
  },
});
