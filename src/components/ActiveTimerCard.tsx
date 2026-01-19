import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Order } from '../types';
import { TimerDisplay, IconButton, TimePicker } from './index';
import { Icons } from '../theme';
import { Colors, Spacing, Typography } from '../theme';
import * as tokenStorage from '../utils/tokenStorage';
import dbService from '../utils/database';

interface ActiveTimerCardProps {
  order: Order;
  ordlineId?: number;
  assignedUserId?: number;
  onPausePress?: () => void;
  onTimeChange?: (time: { hours: number; minutes: number; seconds: number }) => void;
  style?: ViewStyle;
}

export const ActiveTimerCard: React.FC<ActiveTimerCardProps> = ({
  order,
  ordlineId = 0,
  assignedUserId = 0,
  onPausePress,
  onTimeChange,
  style,
}) => {
  const isDark = useColorScheme() === 'dark';
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handlePlayPausePress = async () => {
    try {
      // Get auth token
      let authToken = '';
      const tokens = await tokenStorage.getTokens();
      if (tokens?.accessToken) {
        authToken = tokens.accessToken;
      } else {
        const refreshToken = await dbService.getSetting('refreshToken');
        if (!refreshToken) {
          Alert.alert('Error', 'Not authenticated. Please reconnect in Settings.');
          return;
        }
        authToken = refreshToken;
      }

      const cetecUrl = await dbService.getSetting('cetecUrl');
      if (!cetecUrl) {
        Alert.alert('Error', 'CetecERP URL not configured.');
        return;
      }

      const startWorkPayload = {
        work_location_id: 1,
        ordline_map_operation_id: 0,
        build_operation_id: 0,
        setup: false,
        assigned_user_id: assignedUserId,
        number_of_worker: 1,
        overhead_only: false,
        overtime: false,
        ordline_ids: [ordlineId],
        comment: 'if just start work / or play/pause',
        failed_inspection_id: 0,
        serial_ranges: [],
      };

      console.log('Starting work with payload:', startWorkPayload);

      const response = await fetch(`${cetecUrl}/goapis/api/v1/production/order/work_view/start_work`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(startWorkPayload),
      });

      console.log('Start work response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Start work failed:', response.status, errorText);
        Alert.alert('Error', `Failed to start work: ${response.status}`);
        return;
      }

      const responseData = await response.json();
      console.log('Start work response:', responseData);
      
      // Call the original onPausePress after successful API call
      onPausePress?.();
    } catch (error) {
      console.error('Error starting work:', error);
      Alert.alert('Error', `Failed to start work: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
          borderColor: isDark ? Colors.borderDark : Colors.borderLight,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.statusIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeLabel}>ACTIVE TIMER</Text>
          </View>
          <Text
            style={[
              styles.title,
              { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary },
            ]}
          >
            Order #{order.orderNumber} - {order.clientName}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? Colors.textSecondaryDark : Colors.textSecondary },
            ]}
          >
            {order.service}
          </Text>
        </View>
        <IconButton
          icon={Icons.pause}
          onPress={handlePlayPausePress}
          size="large"
          variant="primary"
        />
      </View>

      {order.elapsedTime && (
        <TouchableOpacity
          style={styles.timerSection}
          onPress={() => setShowTimePicker(true)}
        >
          <TimerDisplay
            hours={order.elapsedTime.hours}
            minutes={order.elapsedTime.minutes}
            seconds={order.elapsedTime.seconds}
            size="medium"
          />
        </TouchableOpacity>
      )}

      <TimePicker
        visible={showTimePicker}
        initialTime={order.elapsedTime || { hours: 0, minutes: 0, seconds: 0 }}
        onConfirm={(time) => {
          setShowTimePicker(false);
          onTimeChange?.(time);
        }}
        onCancel={() => setShowTimePicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    ...Typography.titleMedium,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  timerSection: {
    marginTop: Spacing.lg,
  },
});
