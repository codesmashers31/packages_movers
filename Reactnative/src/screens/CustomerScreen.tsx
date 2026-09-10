import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const CustomerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Customer Moves</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create a New Move Request</Text>
        <Text style={styles.cardDescription}>
          Specify pickup/drop addresses, inventory items, lift availability, and preferred dates.
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>+ Start New Move</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Active Bookings</Text>
        <Text style={styles.emptyText}>No active moves currently scheduled.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
