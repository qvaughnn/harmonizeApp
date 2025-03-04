import { StyleSheet, Image, Platform, Text } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PaperProvider } from 'react-native-paper';

export default function TabTwoScreen() {
  return (
    // <ThemedView style={styles.overall}>
      
    // </ThemedView>
    <PaperProvider>
      <Text>
        Hi
      </Text>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
  },
});
