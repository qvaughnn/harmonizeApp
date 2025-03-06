import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const iconColor = Colors[colorScheme ?? 'light'].icon;
  // const [pressed, setPressed] = useState(false);

  // const handlePress = () => {
  //   setPressed(!pressed);
  // };


  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => 
          <IconSymbol 
            size={28} 
            name="music.note.house.fill" 
            color={iconColor} 
          />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => 
          <IconSymbol 
            size={28} 
            name="person.2.crop.square.stack" 
            color={iconColor} 
          />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => 
          <IconSymbol 
            size={28} 
            name="magnifyingglass" 
            color={iconColor} 
          />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => 
          <IconSymbol 
            size={28} 
            name="person.crop.circle" 
            color={iconColor} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Log In',
          tabBarIcon: ({ color }) => 
          <IconSymbol 
            size={28} 
            name="star.fill" 
            color={iconColor} />,
        }}
      />
    </Tabs>
  );
}
