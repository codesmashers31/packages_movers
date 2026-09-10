import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const WorkerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Worker Assignments</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Jobs</Text>
        <Text style={styles.emptyText}>No pending jobs assigned for today.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Milestone Progression</Text>
        <Text style={styles.helperText}>
          When assigned to a move, you will advance stages: En Route &rarr; Arrived &rarr; Packing &rarr; Loading &rarr; In Transit &rarr; Unloading &rarr; Confirm Delivery.
        </Text>
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
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
});
