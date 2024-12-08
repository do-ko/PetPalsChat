import React, {createContext, useContext, useState} from 'react';
import {Client} from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// ChatMessageResponse.ts
export type ChatMessageResponse = {
    content: string;
    sendAt: string;
    senderId: string;
}

// ChatroomResponse.ts
export type ChatroomResponse = {
    chatroomId: string;
    participants: string[]; // List of user IDs
}

export type LatestMessageResponse = {
    chatroomId: string;
    latestMessage?: ChatMessageResponse; // Optional, as a chatroom may not have messages
}

type ChatContextType = {
    chats: ChatroomResponse[];
    setChats: React.Dispatch<React.SetStateAction<ChatroomResponse[]>>;
    stompClient: Client | null;
    connectWebSocket: (token: string) => void;
    chatMessages: Record<string, ChatMessageResponse[]>;
    setChatMessages: React.Dispatch<Record<string, ChatMessageResponse[]>>
    latestMessages: Record<string, ChatMessageResponse | null>;
    setLatestMessages: React.Dispatch<Record<string, ChatMessageResponse | null>>
};

const WebSocketContext = createContext<ChatContextType | null>(null);

export const WebSocketProvider = ({children}: { children: React.ReactNode }) => {
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [chats, setChats] = useState<ChatroomResponse[]>([]);
    const [chatMessages, setChatMessages] = useState<Record<string, ChatMessageResponse[]>>({});
    const [latestMessages, setLatestMessages] = useState<Record<string, ChatMessageResponse | null>>({});

    const connectWebSocket = (token: string) => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://192.168.1.4:8080/ws'),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log('Connected to WebSocket');
                chats.forEach((chat) => {
                    client.subscribe(`/user/chat/${chat.chatroomId}`, (message) => {
                        console.log(`Message received for chatroom ${chat.chatroomId}:`, message.body);
                        const newMessage: ChatMessageResponse = JSON.parse(message.body);
                        handleNewMessage(chat.chatroomId, newMessage);
                    });
                });
            },
            onDisconnect: () => console.log('WebSocket disconnected'),
            onStompError: (frame) => {
                console.error('STOMP error:', frame);
            },
        });
        client.activate();
        setStompClient(client);
    };

    const handleNewMessage = (chatId: string, newMessage: ChatMessageResponse) => {
        console.log("NEW MESSAGE PUSHED TO MESSAGE STATE")
        setChatMessages((prev) => ({
            ...prev,
            [chatId]: [newMessage, ...(prev[chatId] || [])],
        }));
        setLatestMessages((prev) => ({
            ...prev,
            [chatId]: newMessage,
        }));
    };

    return (
        <WebSocketContext.Provider
            value={{
                chats,
                setChats,
                stompClient,
                connectWebSocket,
                chatMessages,
                setChatMessages,
                latestMessages,
                setLatestMessages
            }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};
