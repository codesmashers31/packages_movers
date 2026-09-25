import "./global.css";
import React from "react";
import { View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { MoveProvider } from "./src/state/MoveContext";
import { AuthProvider, useAuth } from "./src/state/AuthContext";
import { AuthScreen } from "./src/screens/AuthScreen";

function Session() {
  const { user } = useAuth();
  if (!user) return <AuthScreen />;
  return (
    <MoveProvider key={user.email} accountKey={user.email}>
      <AppNavigator />
    </MoveProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  if (!fontsLoaded && !fontError)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAF9FD",
        }}
      >
        <ActivityIndicator color="#6125C5" />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: "#EAE5F0", alignItems: "center" }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: Platform.OS === "web" ? 480 : undefined,
        }}
      >
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AuthProvider>
            <Session />
          </AuthProvider>
        </SafeAreaProvider>
      </View>
    </View>
  );
}
