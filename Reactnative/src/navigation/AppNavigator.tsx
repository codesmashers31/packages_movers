import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList, TabParamList } from "../types";
import { Icon, type IconName } from "../components/ui";
import { HomeScreen } from "../screens/HomeScreen";
import { CustomerScreen } from "../screens/CustomerScreen";
import { WorkerScreen } from "../screens/WorkerScreen";
import { QuotesScreen } from "../screens/QuotesScreen";
import { BookingScreen } from "../screens/BookingScreen";
import {
  MovesScreen,
  UpdatesScreen,
  ProfileScreen,
  HelpScreen,
} from "../screens/AccountScreens";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const icons: Record<keyof TabParamList, IconName> = {
  Home: "home",
  Moves: "truck",
  Updates: "bell",
  Profile: "user",
};
function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#6125C5",
        tabBarInactiveTintColor: "#958B9F",
        tabBarStyle: {
          height: 76 + insets.bottom,
          paddingTop: 9,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopColor: "#EAE5F0",
          backgroundColor: "#FFFFFF",
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: "Manrope_700Bold",
          fontSize: 10,
          lineHeight: 14,
          marginTop: 0,
        },
        tabBarIcon: ({ color }) => (
          <Icon name={icons[route.name]} color={color} size={21} />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen
        name="Moves"
        component={MovesScreen}
        options={{ title: "My Moves" }}
      />
      <Tabs.Screen name="Updates" component={UpdatesScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}
export function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: "#6125C5",
          background: "#FAF9FD",
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FAF9FD" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Customer" component={CustomerScreen} />
        <Stack.Screen name="Quotes" component={QuotesScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Worker" component={WorkerScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
