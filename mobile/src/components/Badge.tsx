import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  text: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export default function Badge({ text, variant = 'neutral', size = 'medium', style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`badge_${variant}`], styles[`badge_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badge_success: {
    backgroundColor: '#dcfce7',
  },
  badge_warning: {
    backgroundColor: '#fef3c7',
  },
  badge_danger: {
    backgroundColor: '#fee2e2',
  },
  badge_info: {
    backgroundColor: '#dbeafe',
  },
  badge_neutral: {
    backgroundColor: '#f1f5f9',
  },
  badge_small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badge_medium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '600',
  },
  text_success: {
    color: '#16a34a',
  },
  text_warning: {
    color: '#ca8a04',
  },
  text_danger: {
    color: '#dc2626',
  },
  text_info: {
    color: '#2563eb',
  },
  text_neutral: {
    color: '#475569',
  },
  text_small: {
    fontSize: 11,
  },
  text_medium: {
    fontSize: 13,
  },
});
