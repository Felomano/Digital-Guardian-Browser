import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Font from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [featherFontLoaded, setFeatherFontLoaded] = React.useState(false);

  useEffect(() => {
    // Load Feather icon font explicitly for mobile
    async function loadIconFont() {
      try {
        await Font.loadAsync({
          ...Feather.font,
        });
        setFeatherFontLoaded(true);
      } catch (e) {
        console.warn("Failed to load icon font:", e);
        setFeatherFontLoaded(true); // Continue anyway
      }
    }

    loadIconFont();
  }, []);

  useEffect(() => {
    // Wait for both text fonts AND icon font to load
    if ((fontsLoaded || fontError) && featherFontLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, featherFontLoaded]);

  // Don't show content until all fonts (text + icons) are loaded
  if ((!fontsLoaded && !fontError) || !featherFontLoaded) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.primary },
                animation: "fade_from_bottom",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="home" />
              <Stack.Screen
                name="browser"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="community"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="heroes"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="profile"
                options={{ animation: "slide_from_right" }}
              />
            </Stack>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
