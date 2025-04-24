import { Image, StyleSheet, Platform, View, ImageBackground, Pressable, ScrollView} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, TextInput, Button, Searchbar, Avatar, Card } from 'react-native-paper';
import React, { useEffect, useState } from 'react';
import { app, database } from "../config/firebase";
import { useAuth } from '../../contexts/AuthContext';
// import {User} from '@/types';
// import { PlaylistPreview, Playlist, UserRef, Song } from '@/types';
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

const Friends = () => {

  const { currentUser } = useAuth(); 
  const id = currentUser.id;
  // console.log('🟢 current friends:', getFriends(id));
  const [searchQuery, setSearchQuery] = React.useState('');
  function handleSearchQueryChange(query: string): void {
    setSearchQuery(query);
  }

  
  const [friends, setFriends] = useState<string[]>([]);
  const [received, setReceived] = React.useState<string[]>([]);
  const [sent, setSent] = React.useState<string[]>([]);

  useEffect(() => {
    setFriends(getFriends(id));
  }, [currentUser]);

  useEffect(() => {
    console.log('friends updated:', friends);
  }, [friends]);

  useEffect(() => {
    setReceived(getReceivedFriendRequests(id));
  }, [currentUser]);

  useEffect(() => {
    console.log('recieved updated:', friends);
  }, [received]);


  const handleAccept = async (requester: string) => {
    await acceptFriendRequest(id, requester);
  };

  const handleDecline = async (requester: string) => {
    await declineFriendRequest(id, requester);
  };


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
      <Text variant="headlineMedium" style={styles.requests}>
          Friend Requests
        </Text>

      <Text variant="headlineMedium" style={styles.yourFriends}>
          Your Friends
        </Text>

      {/* <View style={styles.listContainer}>
        {friends.map((friend, index) => (
          <Card key={index} style={styles.friendCard}>
            <View style={styles.friendInfo}>
              <View style={styles.textContainer}>
                <Text style={styles.friendName}> {friend.name}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View> */}
      {/* <ScrollView contentContainerStyle={styles.listContainer}> */}
        {/* {friends.map((friendId) => (
          <Card key={friendId} style={styles.friendCard}>
            <Card.Content style={styles.friendCard}>
              <Avatar.Text size={40} label={friendId.charAt(0).toUpperCase()} />
              <Text style={styles.friendName}>{friendId}</Text>
            </Card.Content>
          </Card>
        ))} */}
        {/* <Text variant="headlineSmall" style={styles.subheader}>
          Incoming Requests
        </Text>
        {received.map((req) => (
          <Card key={req} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Text size={40} label={req.charAt(0).toUpperCase()} />
              <Text style={styles.cardText}>{req}</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => handleAccept(req)}>Accept</Button>
              <Button onPress={() => handleDecline(req)}>Decline</Button>
            </Card.Actions>
          </Card>
        ))} */}

        {/* <Text variant="headlineSmall" style={styles.subheader}>
          Sent Requests
        </Text>
        {sent.map((req) => (
          <Card key={req} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Text size={40} label={req.charAt(0).toUpperCase()} />
              <Text style={styles.cardText}>{req}</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => handleCancel(req)}>Cancel</Button>
            </Card.Actions>
          </Card>
        ))} */}
      {/* </ScrollView> */}
    </ThemedView>
  );
}

export default Friends;

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
  // playlistText: {
  //   fontSize: 14,
  //   color: 'white'
  // },
  yourFriends: {
    fontWeight: 'bold',
    color: 'darkgrey',
    position: 'absolute',
    top: 480,
    left: 25,
    justifyContent: 'flex-start',
  },
  requests: {
    fontWeight: 'bold',
    color: 'darkgrey',
    position: 'absolute',
    top: 230,
    left: 25,
    justifyContent: 'flex-start',
  },
});