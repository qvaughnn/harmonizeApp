import {
    addFriend,
    removeFriend,
    cancelFriendRequest,
    declineFriendRequest,
    acceptFriendRequest,
    getFriends,
    getReceivedFriendRequests,
    getSentFriendRequests
} from '../../app/(tabs)/friends';

import * as firebaseDatabase from "firebase/database";

const { set, get, remove } = firebaseDatabase;

describe("Friend Functions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("addFriend works", async () => {
        const result = await addFriend("alice", "bob");
        expect(result).toBe(true);
        expect(set).toHaveBeenCalledTimes(2);
    });

    test("removeFriend works", async () => {
        const result = await removeFriend("alice", "bob");
        expect(result).toBe(true);
        expect(remove).toHaveBeenCalledTimes(2);
    });

    test("cancelFriendRequest works", async () => {
        const result = await cancelFriendRequest("alice", "bob");
        expect(result).toBe(true);
        expect(remove).toHaveBeenCalledTimes(2);
    });

    test("declineFriendRequest works", async () => {
        const result = await declineFriendRequest("bob", "alice");
        expect(result).toBe(true);
        expect(remove).toHaveBeenCalledTimes(2);
    });

    test("acceptFriendRequest works", async () => {
        const result = await acceptFriendRequest("bob", "alice");
        expect(result).toBe(true);
        expect(set).toHaveBeenCalledTimes(2);
        expect(remove).toHaveBeenCalledTimes(2);
    });

    test("getFriends returns friend list", async () => {
        const result = await getFriends("bob");
        expect(result).toEqual(["friend1", "friend2"]);
        expect(get).toHaveBeenCalledTimes(1);
    });

    test("getReceivedFriendRequests returns list", async () => {
        const result = await getReceivedFriendRequests("bob");
        expect(result).toEqual(["friend1", "friend2"]);
    });

    test("getSentFriendRequests returns list", async () => {
        const result = await getSentFriendRequests("bob");
        expect(result).toEqual(["friend1", "friend2"]);
    });
});
