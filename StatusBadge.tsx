import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'busy' | 'free';
  label?: string | null;
  size?: 'small' | 'medium' | 'large';
}

export function StatusBadge({ status, label, size = 'medium' }: StatusBadgeProps) {
  const colors = {
    free: '#10B981',
    busy: '#6B7280',
  };
  
  const labels = {
    free: '暇',
    busy: '暇じゃない',
  };

  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
    medium: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 12 },
    large: { paddingHorizontal: 14, paddingVertical: 6, fontSize: 14 },
  };

  // busyの場合は常にデフォルト表示、freeの場合のみlabelを使用
  const displayText = status === 'busy' ? labels[status] : (label || labels[status]);

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors[status] },
      sizeStyles[size]
    ]}>
      <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize }]}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontWeight: '600',
  },
});
