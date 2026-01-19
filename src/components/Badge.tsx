import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  useColorScheme,
} from 'react-native';
import { Spacing, Typography } from '../theme';

interface BadgeProps {
  label: string;
  status?: 'pending' | 'in_progress' | 'completed';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, status, style }) => {
  const isDark = useColorScheme() === 'dark';

  const getStatusColors = () => {
    switch (status) {
      case 'in_progress':
        return {
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(191, 219, 254, 0.5)',
          labelColor: isDark ? '#60a5fa' : '#1e40af',
        };
      case 'pending':
        return {
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(254, 243, 199, 0.6)',
          labelColor: isDark ? '#fbbf24' : '#92400e',
        };
      case 'completed':
        return {
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(209, 250, 229, 0.6)',
          labelColor: isDark ? '#6ee7b7' : '#065f46',
        };
      default:
        return {
          backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(226, 232, 240, 0.6)',
          labelColor: isDark ? '#cbd5e1' : '#334155',
        };
    }
  };

  const colors = getStatusColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.backgroundColor },
        style,
      ]}
    >
      <Text style={[styles.badgeLabel, { color: colors.labelColor }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
});
