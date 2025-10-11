import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color="#cbd5e1" />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 200,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});
