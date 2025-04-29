import { Image, StyleSheet, Platform, View, ImageBackground, Pressable, ScrollView} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, TextInput, Button, Searchbar, Avatar, Card, IconButton, Portal, Modal} from 'react-native-paper';
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
  const id = currentUser!.id;
  console.log('friends at load:', getFriends(id));
  
  const [friends, setFriends] = useState<string[]>([]);
  const [received, setReceived] = React.useState<string[]>([]);
  const [sent, setSent] = React.useState<string[]>([]);

  const [addVisible, setAddVisible] = useState(false);
  const [newFriendId, setNewFriendId] = useState('');

  // useEffect(() => {
  //   setFriends(getFriends(id));
  // }, [currentUser]);

  // useEffect(() => {
  //   console.log('friends updated:', friends);
  // }, [friends]);

  // useEffect(() => {
  //   setReceived(getReceivedFriendRequests(id));
  // }, [currentUser]);

  // useEffect(() => {
  //   console.log('recieved updated:', friends);
  // }, [received]);


  const handleAccept = async (requester: string) => {
    await acceptFriendRequest(id, requester);
  };

  const handleDecline = async (requester: string) => {
    await declineFriendRequest(id, requester);
  };

  const openAdd = () => setAddVisible(true);

  const closeAdd = () => {
    setNewFriendId('');
    setAddVisible(false);
  };

  const handleAdd = () => {
    addFriend(id, newFriendId);
    console.log('friend added:', newFriendId);
    closeAdd();
  }

  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        FRIENDS
      </Text>

      <Text style={styles.code}>
        Share your unique code with others to collaborate:
      </Text>

      <Card style={styles.codeCard}>
          <Text style={styles.codeCardText}> {id} </Text>
      </Card>
      
      <Text variant="headlineMedium" style={styles.requests}>
          Friend Requests
      </Text>

      <ScrollView>
        {/* {recieved.map((friend, index) => (
          <Card key={index} style={styles.friendCard}>
            <View style={styles.friendInfo}>
              <View style={styles.textContainer}>
                <Text style={styles.friendName}> {friend.name}</Text>
              </View>
            </View>
          </Card>
        ))} */}
      </ScrollView>

      <Text variant="headlineMedium" style={styles.yourFriends}>
          Your Friends
      </Text>

      <Button 
        mode="contained" 
        onPress={openAdd} 
        style={styles.addButton}
        labelStyle={styles.addButtonText}>
        Add
      </Button>

      <View style={styles.modalView}>
        <Modal
          visible={addVisible}
          // onDismiss={closeAdd}
          contentContainerStyle={styles.modalContainer}
        >
          <IconButton
            icon="close"
            size={24}
            onPress={closeAdd}
            style={styles.closeIcon}
          />
          <Text style={styles.modalTitle}>Add a Friend</Text>
          <TextInput
            label="Friend’s User ID"
            value={newFriendId}
            onChangeText={setNewFriendId}
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleAdd}
            style={styles.confirmButton}
          >
            Add
          </Button>
        </Modal>
      </View>
      <ScrollView>
        {/* {friends.map((friend, index) => (
          <Card key={index} style={styles.friendCard}>
            <View style={styles.friendInfo}>
              <View style={styles.textContainer}>
                <Text style={styles.friendName}> {friend.name}</Text>
              </View>
            </View>
          </Card>
        ))} */}
      </ScrollView>
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
  listContainer: {
    width: '100%',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  friendCard: {
    width: '70%',
    height: 50,
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
  codeCard: {
    width: 100,
    height: 50, 
    top: 90,
    backgroundColor: '#D2B4DE',
    borderWidth: 1,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeCardText: {
    color: 'black',
    fontWeight: 'bold',
  },
  code: {
    top: 80,
    color: 'white',
    paddingLeft: 10,
    paddingRight: 10,
  },
  addButton: {
    width: 100,
    height: 45, 
    top: 7,
    left: 120,
    backgroundColor: '#C39BD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20
  },
  modalView: {
    right: '35%',
    bottom: 100
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 20,
    height: 250,
    width: 250,
  },
  closeIcon: {
    position: 'absolute',
    right: 4,
    top: 4,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  confirmButton: {
    borderRadius: 6,
  },
});