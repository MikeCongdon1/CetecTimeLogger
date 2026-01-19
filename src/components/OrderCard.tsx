import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { Order } from '../types';
import { Badge, IconButton } from './index';
import { Icons } from '../theme';
import { Colors, Spacing, Typography } from '../theme';

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onActionPress,
  style,
}) => {
  const isDark = useColorScheme() === 'dark';

  const isActive = order.status === 'in_progress';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
          borderColor: isActive
            ? Colors.primary
            : isDark
              ? Colors.borderDark
              : Colors.borderLight,
          ...(isActive && { borderLeftWidth: 4 }),
          ...(!isActive && { borderWidth: 1 }),
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Badge
          label={order.status.replace('_', ' ')}
          status={order.status}
        />
        <Text
          style={[
            styles.orderNumber,
            { color: isDark ? Colors.textSecondaryDark : Colors.textSecondary },
          ]}
        >
          #{order.orderNumber}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.clientName,
              { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary },
            ]}
          >
            {order.clientName}
          </Text>
          <Text
            style={[
              styles.service,
              { color: isDark ? Colors.textSecondaryDark : Colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {order.service}
          </Text>
          <View style={styles.location}>
            <Text
              style={[
                styles.locationIcon,
                { color: isDark ? Colors.textMutedDark : Colors.textMuted },
              ]}
            >
              📍
            </Text>
            <Text
              style={[
                styles.locationText,
                { color: isDark ? Colors.textMutedDark : Colors.textMuted },
              ]}
            >
              {order.location}
            </Text>
          </View>
        </View>

        <View style={styles.action}>
          <IconButton
            icon={order.isActive ? Icons.pause : Icons.play}
            onPress={onActionPress || (() => {})}
            size="medium"
            variant={order.isActive ? 'primary' : 'secondary'}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  orderNumber: {
    ...Typography.labelSmall,
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  clientName: {
    ...Typography.titleMedium,
    marginBottom: Spacing.xs,
  },
  service: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    ...Typography.labelSmall,
    flex: 1,
  },
  action: {
    justifyContent: 'center',
  },
});
