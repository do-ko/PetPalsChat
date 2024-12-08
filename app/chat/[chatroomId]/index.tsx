import React, {useEffect, useState} from 'react';
import {Button, FlatList, Image, StyleSheet, Text, TextInput, View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {ChatMessageResponse, useWebSocket} from "@/context/WebSocketContext";

const API_BASE_URL = 'http://192.168.1.4:8080/api'; // Replace with your backend's base URL

export interface ChatMessagePage {
    content: ChatMessageResponse[];
    page: PageData;
}

export interface PageData {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
}

const ChatPage: React.FC = () => {
    const {chatroomId, userId, token} = useLocalSearchParams<{ chatroomId: string; userId: string; token: string }>();
    const [inputMessage, setInputMessage] = useState<string>(''); // Message input
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const {stompClient, chatMessages, setChatMessages} = useWebSocket();

    const fetchMessages = async (reset = false) => {
        console.log("FETCHING MESSAGES")
        if (!hasMore) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/chatroom/${chatroomId}/messages?page=${page}&size=15&sort=sentAt,asc`, {
                headers: {Authorization: `Bearer ${token}`},
            });
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            const data: ChatMessagePage = await response.json();
            if (data.content.length > 0) {
                const updatedMessages = {...chatMessages};
                updatedMessages[chatroomId] = reset
                    ? data.content
                    : [...(chatMessages[chatroomId] || []), ...data.content];

                setChatMessages(updatedMessages)

            } else {
                setHasMore(false); // No more messages
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = () => {
        if (stompClient) {
            const messagePayload = {
                chatroomId,
                senderId: userId,
                content: inputMessage,
            };

            stompClient.publish({
                destination: '/app/chat', // Maps to the `@MessageMapping("/chat")` endpoint
                body: JSON.stringify(messagePayload),
            });

            setInputMessage('');
        } else {
            console.log('WebSocket not connected');
        }
    };

    // Fetch messages when the component loads
    useEffect(() => {
        console.log("CHECKING CHATID and TOKEN: " + chatroomId + token)
        if (!chatroomId || !token) return;

        if (page === 0) {
            // Initial load: Reset messages and fetch fresh data
            console.log("RESETTING MESSAGES FOR NEW CHATROOM");
            fetchMessages(true);
        } else {
            // Paginated fetch: Append messages
            console.log("FETCHING ADDITIONAL MESSAGES FOR CHATROOM");
            fetchMessages();
        }
    }, [chatroomId, token, page]);


    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            setPage((prevPage) => prevPage + 1);
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={chatMessages[chatroomId]}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({item}) =>
                    (
                        <View
                            style={[styles.messageContainer, item.senderId === userId ? styles.myMessage : styles.otherMessage]}>
                            <View style={styles.bubble}>
                                <Text style={styles.sender}>{item.senderId}</Text>
                                <Text style={styles.content}>{item.content}</Text>
                                <Text style={styles.timestamp}>{new Date(item.sendAt).toLocaleTimeString()}</Text>
                            </View>
                        </View>
                    )
                }
                inverted // Show the latest messages at the bottom
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={() =>
                    isLoading ? <Text>Loading...</Text> : null}
            />
            {/* Input Field */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message"
                    value={inputMessage}
                    onChangeText={setInputMessage}
                />
                <Button title="Send" onPress={sendMessage}/>
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 10,
    },
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 5,
    },
    myMessage: {
        justifyContent: 'flex-end',
        alignSelf: 'flex-end',
    },
    otherMessage: {
        justifyContent: 'flex-start',
        alignSelf: 'flex-start',
    },
    bubble: {
        maxWidth: '70%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#e1f5fe',
    },
    content: {
        fontSize: 16,
    },
    sender: {
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 5,
    },
    timestamp: {
        fontSize: 10,
        color: 'gray',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        padding: 10,
        marginRight: 10,
    },
});

export default ChatPage;
