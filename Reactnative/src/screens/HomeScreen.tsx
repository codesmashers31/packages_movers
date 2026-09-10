import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Local Movers</Text>
      <Text style={styles.subtitle}>Select your portal to continue</Text>

      <TouchableOpacity
        style={[styles.button, styles.customerButton]}
        onPress={() => navigation.navigate('Customer')}
      >
        <Text style={styles.buttonText}>Customer Experience</Text>
        <Text style={styles.buttonSubtext}>Book and track household moves</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.workerButton]}
        onPress={() => navigation.navigate('Worker')}
      >
        <Text style={styles.buttonText}>Worker Experience</Text>
        <Text style={styles.buttonSubtext}>View jobs, update milestones, verify delivery</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  customerButton: {
    backgroundColor: '#2563EB',
  },
  workerButton: {
    backgroundColor: '#0F172A',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonSubtext: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
});
