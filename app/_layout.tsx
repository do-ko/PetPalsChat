import {Stack} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import {WebSocketProvider} from "@/context/WebSocketContext";
import {useEffect} from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    useEffect(() => {
            SplashScreen.hideAsync();
    }, []);
    return (
        <WebSocketProvider>
            <Stack
                screenOptions={{
                    headerShown: true,
                    headerShadowVisible: false,
                    headerTransparent: true,
                    headerTitle: "",
                    headerBackVisible: true,
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{title: "CHATS"}}
                />
                <Stack.Screen name="+not-found"/>
            </Stack>
        </WebSocketProvider>

    );
}