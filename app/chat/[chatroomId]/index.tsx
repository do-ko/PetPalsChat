import React, {useEffect, useState} from 'react';
import {Button, FlatList, StyleSheet, Text, TextInput, View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {ChatMessageResponse} from "@/app";

const API_BASE_URL = 'http://localhost:8080/api'; // Replace with your backend's base URL

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
    const [messages, setMessages] = useState<ChatMessageResponse[]>([]); // Store messages
    const [inputMessage, setInputMessage] = useState<string>(''); // Message input
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch messages on component load
    const fetchMessages = async () => {
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
                setMessages((prevMessages) => [...prevMessages, ...data.content]); // Append older messages
            } else {
                setHasMore(false); // No more messages
            }
            // setMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch messages when the component loads
    useEffect(() => {
        console.log("CHECKING CHATID and TOKEN: " + chatroomId + token)
        if (chatroomId && token) {
            fetchMessages();
        }
    }, [chatroomId, token, page]);

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            setPage((prevPage) => prevPage + 1);
        }
    };

    // Placeholder images for now (if avatars are needed later)
    const getPlaceholderImage = (id: string) => `https://via.placeholder.com/40?text=${id.charAt(0).toUpperCase()}`;

    return (
        <View style={styles.container}>
            <FlatList
                data={messages}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({item}) => (
                    <View
                        style={[styles.messageContainer, item.senderId === userId ? styles.myMessage : styles.otherMessage]}>
                        <View style={styles.bubble}>
                            <Text style={styles.sender}>{item.senderId}</Text>
                            <Text style={styles.content}>{item.content}</Text>
                            <Text style={styles.timestamp}>{new Date(item.sendAt).toLocaleTimeString()}</Text>
                        </View>
                    </View>
                )}
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
                <Button title="Send" onPress={() => console.log('Send message functionality pending')}/>
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
