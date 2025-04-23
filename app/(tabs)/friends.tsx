import { Image, StyleSheet, Platform, View, ImageBackground, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, TextInput, Button, Searchbar, Avatar, Card } from 'react-native-paper';
import * as React from 'react';
import { app, database } from "../config/firebase";
import { ref, set, onValue, get, child, push, DatabaseReference, query, orderByChild, equalTo, DataSnapshot, remove } from "firebase/database";

// returns true if successful and false if not
export async function addFriend(currentUser: string, targetUser: string): Promise<boolean> {
  try {
    const sentRef = ref(database, `friend_requests/${currentUser}/sent/${targetUser}`);
    const receivedRef = ref(database, `friend_requests/${targetUser}/received/${currentUser}`);

    // Send request from currentUser to targetUser
    await Promise.all([
      set(sentRef, true),
      set(receivedRef, true)
    ]);

    return true;
  } catch (error) {
    console.error("Error sending friend request:", error);
    return false;
  }
}

// returns true if successful and false if not
export async function removeFriend(currentUser: string, targetUser: string): Promise<boolean> {
  try {
    const userFriendRef = ref(database, `friends/${currentUser}/${targetUser}`);
    const friendUserRef = ref(database, `friends/${targetUser}/${currentUser}`);

    await Promise.all([
      remove(userFriendRef),
      remove(friendUserRef)
    ]);

    return true;
  } catch (error) {
    console.error("Error removing friend:", error);
    return false;
  }
}

export async function cancelFriendRequest(currentUser: string, targetUser: string): Promise<boolean> {
  try {
    const sentRef = ref(database, `friend_requests/${currentUser}/sent/${targetUser}`);
    const receivedRef = ref(database, `friend_requests/${targetUser}/received/${currentUser}`);

    await Promise.all([
      remove(sentRef),
      remove(receivedRef)
    ]);

    return true;
  } catch (error) {
    console.error("Error canceling friend request:", error);
    return false;
  }
}

export async function declineFriendRequest(currentUser: string, requester: string): Promise<boolean> {
  try {
    const receivedRef = ref(database, `friend_requests/${currentUser}/received/${requester}`);
    const sentRef = ref(database, `friend_requests/${requester}/sent/${currentUser}`);

    await Promise.all([
      remove(receivedRef),
      remove(sentRef)
    ]);

    return true;
  } catch (error) {
    console.error("Error declining friend request:", error);
    return false;
  }
}

export async function acceptFriendRequest(currentUser: string, requester: string): Promise<boolean> {
  try {
    // Create mutual friendship
    const userFriendRef = ref(database, `friends/${currentUser}/${requester}`);
    const requesterFriendRef = ref(database, `friends/${requester}/${currentUser}`);

    // Delete friend request (both directions)
    const receivedRef = ref(database, `friend_requests/${currentUser}/received/${requester}`);
    const sentRef = ref(database, `friend_requests/${requester}/sent/${currentUser}`);

    await Promise.all([
      set(userFriendRef, true),
      set(requesterFriendRef, true),
      remove(receivedRef),
      remove(sentRef)
    ]);

    return true;
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return false;
  }
}

export async function getFriends(userId: string): Promise<string[]> {
  try {
    const snapshot = await get(ref(database, `friends/${userId}`));
    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }
    return [];
  } catch (error) {
    console.error("Error getting friends:", error);
    return [];
  }
}

export async function getReceivedFriendRequests(userId: string): Promise<string[]> {
  try {
    const snapshot = await get(ref(database, `friend_requests/${userId}/received`));
    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }
    return [];
  } catch (error) {
    console.error("Error getting received friend requests:", error);
    return [];
  }
}

export async function getSentFriendRequests(userId: string): Promise<string[]> {
  try {
    const snapshot = await get(ref(database, `friend_requests/${userId}/sent`));
    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }
    return [];
  } catch (error) {
    console.error("Error getting sent friend requests:", error);
    return [];
  }
}

export default function TabTwoScreen() {


  const [searchQuery, setSearchQuery] = React.useState('');
  function handleSearchQueryChange(query: string): void {
    setSearchQuery(query);
  }


  /*
    This is just a hardcoded example for the friends page
  */
  const friends = [
    { name: 'Alice', playlists: 4, avatar: require('../../assets/images/avatar.png') },
    { name: 'Charlie', playlists: 2, avatar: require('../../assets/images/avatar.png') },
    { name: 'Lucy', playlists: 8, avatar: require('../../assets/images/avatar.png') },
    { name: 'Julie', playlists: 5, avatar: require('../../assets/images/avatar.png') },
    { name: 'Cameron', playlists: 3, avatar: require('../../assets/images/avatar.png') }
  ]


  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        FRIENDS
      </Text>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search Friends"
          value={searchQuery}
          onChangeText={handleSearchQueryChange}
          style={styles.searchbar}
        />
      </View>
      <View style={styles.listContainer}>
        {friends.map((friend, index) => (
          <Card key={index} style={styles.friendCard}>
            <View style={styles.friendInfo}>
              <Avatar.Image size={40} source={friend.avatar} />
              <View style={styles.textContainer}>
                <Text style={styles.friendName}> {friend.name}</Text>
                <Text style={styles.playlistText}> {friend.playlists} playlists</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  overall: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  title: {
    fontWeight: 'bold',
    color: 'darkgrey',
    position: 'absolute',
    top: 80,
    left: 25,
    justifyContent: 'flex-start',
  },
  searchContainer: {
    marginTop: 100,
    width: '90%'
  },
  searchbar: {
    width: '100%',
    marginBottom: 30,
  },
  listContainer: {
    width: '100%',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  friendCard: {
    width: '70%',
    height: 50, //adjusts the friend tile height
    // backgroundcolor: 'transparant',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 10,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  playlistText: {
    fontSize: 14,
    color: 'white'
  },
});
