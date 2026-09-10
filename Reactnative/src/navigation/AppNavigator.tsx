import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { CustomerScreen } from '../screens/CustomerScreen';
import { WorkerScreen } from '../screens/WorkerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#0F172A',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Local Movers' }}
        />
        <Stack.Screen
          name="Customer"
          component={CustomerScreen}
          options={{ title: 'Customer Moves' }}
        />
        <Stack.Screen
          name="Worker"
          component={WorkerScreen}
          options={{ title: 'Worker Jobs' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
