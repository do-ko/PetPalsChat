import React, {useEffect, useState} from 'react';
import {Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {RelativePathString, router} from 'expo-router';
import {ChatMessageResponse, ChatroomResponse, LatestMessageResponse, useWebSocket} from "@/context/WebSocketContext";

// Backend API Base URL
const API_BASE_URL = 'http://192.168.1.4:8080/api';

const App = () => {
    const [userId, setUserId] = useState(''); // Store logged-in user ID
    const [token, setToken] = useState(''); // Store user's token for authorization

    const [createModalVisible, setCreateModalVisible] = useState(false); // Modal visibility for creating a new chat
    const [deleteModalVisible, setDeleteModalVisible] = useState(false); // Modal visibility for deleting a chat

    const [newChatUserId, setNewChatUserId] = useState(''); // Store user ID input for creating a new chat
    const [deleteChatroomId, setDeleteChatroomId] = useState<string>('')

    const [isConnected, setIsConnected] = useState(false);
    const { chats, setChats, stompClient, connectWebSocket, latestMessages, setLatestMessages } = useWebSocket();

    // Fetch all chats for the logged-in user
    const fetchChats = async () => {
        if (!userId || !token) {
            Alert.alert('Error', 'Please provide a valid user ID and token');
            return;
        }
        try {
            const chatResponse = await fetch(`${API_BASE_URL}/chatroom`, {
                headers: {Authorization: `Bearer ${token}`},
            });
            console.log(chatResponse)
            const chatData: ChatroomResponse[] = await chatResponse.json();
            setChats(chatData);

            let lastMessagePath = ""
            chatData.forEach((chat : ChatroomResponse) => {
                if (lastMessagePath == ""){
                    lastMessagePath += `?chatroomIds=${chat.chatroomId}`
                } else {
                    lastMessagePath += `&chatroomIds=${chat.chatroomId}`
                }
            })
            const latestMessageResponse = await fetch(`${API_BASE_URL}/chatroom/messages/latest${lastMessagePath}`, {
                headers: {Authorization: `Bearer ${token}`},
            });
            console.log(latestMessageResponse)
            const latestMessageData: LatestMessageResponse[] = await latestMessageResponse.json();
            const latestMessagesMap: Record<string, ChatMessageResponse | null> = {};
            latestMessageData.forEach((item) => {
                latestMessagesMap[item.chatroomId] = item.latestMessage || null;
            });
            setLatestMessages(latestMessagesMap)
        } catch (error) {
            console.error('Error fetching chats:', error);
            Alert.alert('Error', 'Unable to fetch chats. Please try again.');
        }
    };

    // Create a new chat
    const createChat = async () => {
        if (!newChatUserId) {
            Alert.alert('Error', 'Please provide a valid user ID');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/chatroom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userIds: [userId, newChatUserId], // Include the current user and the target user
                }),
            });
            if (response.ok) {
                Alert.alert('Success', 'Chat created successfully');
                setCreateModalVisible(false);
                setNewChatUserId('');
                fetchChats(); // Refresh the chats list
            } else {
                Alert.alert('Error', 'Unable to create chat. Please try again.');
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            Alert.alert('Error', 'Unable to create chat. Please try again.');
        }
    };

    const deleteChatroom = async (): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE_URL}/chatroom/${deleteChatroomId}`, {
                method: 'DELETE',
                headers: {Authorization: `Bearer ${token}`},
            });
            if (response.ok) {
                Alert.alert('Success', 'Chat deleted successfully');
                fetchChats(); // Refresh the chat list after deletion
            } else {
                throw new Error('Failed to delete chat');
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            Alert.alert('Error', 'Unable to delete chat. Please try again.');
        }

        setDeleteChatroomId('')
        setDeleteModalVisible(false)
    };

    // Fetch chats when the app starts or when the user ID/token changes
    useEffect(() => {
        if (userId && token) {
            fetchChats();
        }
    }, [userId, token]);

    // Connect to WebSocket whenever the chat list changes
    useEffect(() => {
        if (chats.length > 0) {
            connectWebSocket(token);
        }
    }, [chats]);

    // Clean up WebSocket connection on component unmount
    useEffect(() => {
        return () => {
            if (stompClient) {
                stompClient.deactivate();
            }
        };
    }, [stompClient]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>User Chatrooms</Text>

            {/* User Input for ID and Token */}
            <TextInput
                style={styles.input}
                placeholder="Enter your User ID"
                value={userId}
                onChangeText={setUserId}
            />
            <TextInput
                style={styles.input}
                placeholder="Enter your Token"
                value={token}
                onChangeText={setToken}
                secureTextEntry
            />

            <Button title="Fetch Chats" onPress={fetchChats}/>

            <FlatList
                data={chats}
                keyExtractor={(item) => item.chatroomId.toString()}
                renderItem={({item}) => (
                    <View style={styles.chatItem}>
                        {/* Touchable area for navigating to the chat */}
                        <TouchableOpacity
                            style={styles.chatDetails}
                            onPress={() =>
                                router.push({
                                    pathname: '/chat/[chatroomId]' as RelativePathString, // Matches the dynamic route folder structure
                                    params: {
                                        chatroomId: item.chatroomId, // Dynamically injected parameter
                                        userId, // Pass the logged-in user's ID
                                        token,  // Pass the token
                                    }
                                })
                            }
                        >
                            <Text style={styles.chatTitle}>Chat ID: {item.chatroomId}</Text>
                            <Text>Participants: {item.participants.join(', ')}</Text>
                            <Text>{latestMessages[item.chatroomId]?.content || 'No messages yet'}</Text>
                        </TouchableOpacity>

                        {/* Delete button */}
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                                console.log('Delete button pressed');
                                setDeleteChatroomId(item.chatroomId);
                                setDeleteModalVisible(true);
                            }}
                        >
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            {/* Button to Trigger Create Chat Modal */}
            <TouchableOpacity
                style={styles.createButton}
                onPress={() => setCreateModalVisible(true)}
            >
                <Text style={styles.createButtonText}>Create New Chat</Text>
            </TouchableOpacity>

            {/* Modal for Creating a New Chat */}
            <Modal visible={createModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create New Chat</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter User ID"
                            value={newChatUserId}
                            onChangeText={setNewChatUserId}
                        />
                        <View style={styles.modalButtons}>
                            <Button title="Create" onPress={createChat}/>
                            <Button
                                title="Cancel"
                                color="red"
                                onPress={() => setCreateModalVisible(false)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/*Modal for Deleting a Chat*/}
            <Modal visible={deleteModalVisible} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Delete Chat</Text>
                        <View style={styles.modalButtons}>
                            <Button title="Delete" onPress={deleteChatroom}/>
                            <Button
                                title="Cancel"
                                color="red"
                                onPress={() => setDeleteModalVisible(false)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Styles for the app
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    chatItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    chatDetails: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: 'red',
        padding: 5,
        borderRadius: 5,
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 14,
    },
    createButton: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    createButtonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
});

export default App;
