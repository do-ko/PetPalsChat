// import React, { useEffect, useState } from 'react';
// import { View, Text, TextInput, Button, StyleSheet, FlatList } from 'react-native';
// import { Client } from '@stomp/stompjs';
// import SockJS from 'sockjs-client';
//
// const App = () => {
//   const [messages, setMessages] = useState<string[]>([]);
//   const [inputMessage, setInputMessage] = useState<string>('');
//   const [stompClient, setStompClient] = useState<Client | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [token, setToken] = useState<string>('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkb2tvQG9uZXQuZXUiLCJpYXQiOjE3MzMyNTA3MjJ9.19UA_Y_DD_W0umnGoWAeLFXhfzteH_ibODcLa6qB2NE');
//
//   const connectToWebSocket = () => {
//     // Initialize the STOMP client
//     const client = new Client({
//       // SockJS acts as the WebSocket factory
//       webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
//       connectHeaders: {
//         Authorization: `Bearer ${token}`, // Optional: Pass your token here
//       },
//       debug: (str) => console.log(str), // Debug logs for STOMP connection
//       onConnect: () => {
//         console.log('Connected to STOMP');
//         setIsConnected(true);
//         setMessages((prev) => [...prev, 'Connected to WebSocket']);
//
//         // Subscribe to the server topic
//         client.subscribe('/topic/messages', (message) => {
//           console.log('Message received:', message.body);
//           setMessages((prev) => [...prev, message.body]);
//         });
//       },
//       onDisconnect: () => {
//         console.log('Disconnected from STOMP');
//         setIsConnected(false);
//         setMessages((prev) => [...prev, 'Disconnected from WebSocket']);
//       },
//       onStompError: (frame) => {
//         console.error('STOMP error:', frame);
//         setMessages((prev) => [...prev, 'STOMP error occurred']);
//       },
//     });
//
//     // Activate the client
//     client.activate();
//     setStompClient(client);
//   };
//
//   const sendMessage = () => {
//     if (stompClient && inputMessage.trim()) {
//       stompClient.publish({
//         destination: '/app/chat', // Server-side destination
//         body: inputMessage, // Message content
//       });
//       setMessages((prev) => [...prev, `You: ${inputMessage}`]);
//       setInputMessage('');
//     }
//   };
//
//   // Clean up on component unmount
//   useEffect(() => {
//     return () => {
//       if (stompClient) {
//         stompClient.deactivate();
//       }
//     };
//   }, [stompClient]);
//
//   return (
//       <View style={styles.container}>
//         <Text style={styles.title}>React Native with STOMP and SockJS</Text>
//         <Button title="Connect to WebSocket" onPress={connectToWebSocket} disabled={isConnected} />
//         <FlatList
//             data={messages}
//             keyExtractor={(item, index) => index.toString()}
//             renderItem={({ item }) => <Text style={styles.message}>{item}</Text>}
//             style={styles.messageList}
//         />
//         {isConnected && (
//             <View style={styles.inputContainer}>
//               <TextInput
//                   style={styles.input}
//                   placeholder="Type a message"
//                   value={inputMessage}
//                   onChangeText={setInputMessage}
//               />
//               <Button title="Send" onPress={sendMessage} />
//             </View>
//         )}
//       </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     justifyContent: 'center',
//     backgroundColor: 'white',
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   messageList: {
//     flex: 1,
//     marginVertical: 20,
//   },
//   message: {
//     fontSize: 16,
//     padding: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ccc',
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 5,
//     padding: 10,
//     marginRight: 10,
//   },
// });
//
// export default App;


import React, {useEffect, useState} from 'react';
import {Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

// ChatMessageResponse.ts
export interface ChatMessageResponse {
    content: string;
    sendAt: string;
    senderId: string;
}

// ChatroomResponse.ts
export interface ChatroomResponse {
    chatroomId: string;
    participants: string[]; // List of user IDs
    lastMessage?: ChatMessageResponse; // Optional, as a chatroom may not have messages
}

// Backend API Base URL
const API_BASE_URL = 'http://localhost:8080/api';

const App = () => {
    const [userId, setUserId] = useState(''); // Store logged-in user ID
    const [token, setToken] = useState(''); // Store user's token for authorization
    const [chats, setChats] = useState<ChatroomResponse[]>([]); // Store the chat list
    const [createModalVisible, setCreateModalVisible] = useState(false); // Modal visibility for creating a new chat
    const [deleteModalVisible, setDeleteModalVisible] = useState(false); // Modal visibility for creating a new chat
    const [newChatUserId, setNewChatUserId] = useState(''); // Store user ID input for creating a new chat
    const [deleteChatroomId, setDeleteChatroomId] = useState<string>('')

    // Fetch all chats for the logged-in user
    const fetchChats = async () => {
        if (!userId || !token) {
            Alert.alert('Error', 'Please provide a valid user ID and token');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/chatroom`, {
                headers: {Authorization: `Bearer ${token}`},
            });
            const data = await response.json();
            setChats(data);
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
                        <View style={styles.chatDetails}>
                            <Text style={styles.chatTitle}>Chat ID: {item.chatroomId}</Text>
                            <Text>Participants: {item.participants.join(', ')}</Text>
                            {item.lastMessage ? (
                                <Text>Last Message: {item.lastMessage.content}</Text>
                            ) : (
                                <Text>No messages yet</Text>
                            )}
                        </View>
                        {/* Delete Button */}
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => {
                                console.log('Delete button pressed');
                                setDeleteChatroomId(item.chatroomId)
                                setDeleteModalVisible(true)
                            }
                            }
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
