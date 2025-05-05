import { Image, StyleSheet, Platform, View, ImageBackground, Pressable, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { Text, TextInput, Button, Searchbar, Avatar, Card, IconButton, Portal, Modal } from 'react-native-paper';
import React, { useEffect, useState } from 'react';
import { app, database } from "../config/firebase";
import { useAuth } from '../../contexts/AuthContext';
// import {User} from '@/types';
// import { PlaylistPreview, Playlist, UserRef, Song } from '@/types';
import { ref, set, onValue, get, child, push, DatabaseReference, query, orderByChild, equalTo, DataSnapshot, remove } from "firebase/database";

async function getUserIdByFriendCode(friendCode: string): Promise<string | null> {
  try {
    console.log("Getting user:", friendCode);
    const usersRef = ref(database, "users");

    const q = query(usersRef, orderByChild("profile/friendCode"), equalTo(friendCode));
    const snapshot = await get(q);
    console.log("Snapshot obtained:", snapshot);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const userId = Object.keys(data)[0];
      console.log("ID", userId);
      return userId;
    }

    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

// returns true if successful and false if not
export async function addFriend(currentUser: string, targetUser: string): Promise<boolean> {
  try {
    targetUser = targetUser.toUpperCase();
    if (targetUser.length != 6 || !(/^[A-Z]+$/.test(targetUser))) {
      console.error("Friend codes must be 6 letters");
      return false;
    }
    const friendCodeRef = ref(database, `friendCodes/${targetUser}`);
    const friendCode = await get(friendCodeRef);
    if (!friendCode.exists()) {
      console.error("Friend code doesn't exist:", targetUser);
      return false;
    }

    const userId = await getUserIdByFriendCode(targetUser);

    const sentRef = ref(database, `friend_requests/${currentUser}/sent/${userId}`);
    const receivedRef = ref(database, `friend_requests/${userId}/received/${currentUser}`);

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

async function getFriendCode(id: string): Promise<string> {
  const friendCodeRef = ref(database, `users/${id}/profile/friendCode`);
  const friendCode = await get(friendCodeRef);
  return String(friendCode.val());
}

const Friends = () => {
  const { currentUser } = useAuth();
  const id = currentUser!.id;

  const [friends, setFriends] = useState<{ id: string; code: string }[]>([]);
  const [received, setReceived] = useState<{ id: string; code: string }[]>([]);
  const [addVisible, setAddVisible] = useState(false);
  const [newFriendId, setNewFriendId] = useState('');
  const [title, setTitle] = useState<string>("Loading...");
  useEffect(() => {
    const friendsRef = ref(database, `friends/${id}`);
    const receivedRef = ref(database, `friend_requests/${id}/received`);
    const friendCodeRef = ref(database, `users/${id}/profile/friendCode`);

    const unsubFriends = onValue(friendsRef, (snapshot) => {
      if (snapshot.exists()) {
        const friendIds = Object.keys(snapshot.val());
        const friendCodePromises = friendIds.map(async (friendId) => {
          const codeSnap = await get(ref(database, `users/${friendId}/profile/displayName`));
          return {
            id: friendId,
            code: codeSnap.exists() ? String(codeSnap.val()) : "Unknown"
          };
        });

        Promise.all(friendCodePromises).then(setFriends);
      } else {
        setFriends([]);
      }
    });

    const unsubReceived = onValue(receivedRef, (snapshot) => {
      if (snapshot.exists()) {
        const receivedIds = Object.keys(snapshot.val());

        const receivedCodePromises = receivedIds.map(async (id) => {
          const codeSnap = await get(ref(database, `users/${id}/profile/displayName`));
          return {
            id,
            code: codeSnap.exists() ? String(codeSnap.val()) : "Unknown"
          };
        });

        Promise.all(receivedCodePromises).then(setReceived);
      } else {
        setReceived([]);
      }
    });

    const unsubFriendCode = onValue(friendCodeRef, (snapshot) => {
      if (snapshot.exists()) {
        setTitle(String(snapshot.val()));
      } else {
        setTitle("No code");
      }
    });

    return () => {
      unsubFriends();
      unsubReceived();
      unsubFriendCode();
    };
  }, [id]);

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
  const handleRemove = async (friendId: string) => {
    const success = await removeFriend(id, friendId);
    if (success) {
      console.log(`Removed friend: ${friendId}`);
    } else {
      console.error(`Failed to remove friend: ${friendId}`);
    }
  };

  return (
    <ThemedView style={styles.overall}>
      <Text variant="displayMedium" style={styles.title}>
        FRIENDS
      </Text>
      <Text style={styles.code}>
        Share your unique code with others to collaborate:
      </Text>
      <Card style={styles.codeCard}>
        <Text style={styles.codeCardText}> {title} </Text>
      </Card>
      <Text variant="headlineMedium" style={styles.requests}>
        Friend Requests
      </Text>
      <ScrollView style={styles.receivedList}>
        {received.map((friend, index) => (
          <Card key={index} style={styles.receivedCard}>
            <Card.Content style={styles.friendInfo}>
            <Text style={styles.friendName}>{friend.code}</Text>
            </Card.Content>
            <Card.Actions style={styles.buttonPlacement}>
              <Button onPress={() => handleAccept(friend.id)}>Accept</Button>
              <Button onPress={() => handleDecline(friend.id)}>Decline</Button>
            </Card.Actions>
          </Card>
        ))}
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
            label="Friend's User ID"
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
      <ScrollView style={styles.friendList}>
        {friends.map((friend) => (
          <Card key={friend.id} style={styles.friendCard}>
            <Card.Content style={styles.friendInfo}>
              <Text style={styles.friendName}>{friend.code}</Text>
            </Card.Content>
            <Card.Actions style={styles.buttonPlacement}>
              <Button onPress={() => handleRemove(friend.id)}>Remove</Button>
            </Card.Actions>
          </Card>
        ))}
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
  receivedList: {
    top: 140,
    right: 40
  },
  receivedCard: {
    backgroundColor: 'purple',
    borderWidth: 1,
    borderColor: 'white',
    marginBottom: 15,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  friendList: {
    top: 540,
    left: 30,
    position: 'absolute'
  },
  friendCard: {
    backgroundColor: 'purple',
    borderWidth: 1,
    borderColor: 'white',
    marginBottom: 15,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    // width: 250
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
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
    top: 480,
    left: 270,
    backgroundColor: '#C39BD3',
    justifyContent: 'center',
    position: 'absolute'
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20
  },
  modalView: {
    left: 50,
    position: 'absolute',
    top: 400,

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
  buttonPlacement: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginTop: 8,
    // justifyContent: 'flex-end', 
  }
});