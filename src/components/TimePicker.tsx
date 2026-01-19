import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { IconButton } from './IconButton';
import { Icons } from '../theme';

export interface ElapsedTime {
  hours: number;
  minutes: number;
  seconds: number;
}

interface TimePickerProps {
  visible: boolean;
  initialTime: ElapsedTime;
  onConfirm: (time: ElapsedTime) => void;
  onCancel: () => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  visible,
  initialTime,
  onConfirm,
  onCancel,
}) => {
  const isDark = useColorScheme() === 'dark';
  const [hours, setHours] = useState(initialTime.hours);
  const [minutes, setMinutes] = useState(initialTime.minutes);
  const [seconds, setSeconds] = useState(initialTime.seconds);

  // Update state when initialTime changes (modal opens)
  useEffect(() => {
    setHours(initialTime.hours);
    setMinutes(initialTime.minutes);
    setSeconds(initialTime.seconds);
  }, [visible, initialTime]);

  const handleConfirm = () => {
    onConfirm({ hours, minutes, seconds });
  };

  const TimeColumn = ({
    label,
    value,
    onChange,
    max,
  }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
    max: number;
  }) => {
    const renderItems = () => {
      const items = [];
      // Show selected +/- 3 items for easier selection
      const start = Math.max(0, value - 3);
      const end = Math.min(max, value + 3);

      for (let i = start; i <= end; i++) {
        items.push(
          <TouchableOpacity
            key={i}
            style={[
              styles.timeItem,
              value === i && styles.timeItemActive,
            ]}
            onPress={() => onChange(i)}
          >
            <Text
              style={[
                styles.timeText,
                {
                  color: value === i ? 'white' : isDark ? Colors.textPrimaryDark : Colors.textPrimary,
                  fontSize: value === i ? 24 : 16,
                  fontWeight: value === i ? '700' : '400',
                },
              ]}
            >
              {String(i).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        );
      }
      return items;
    };

    return (
      <View style={styles.column}>
        <Text
          style={[
            styles.columnLabel,
            { color: isDark ? Colors.textSecondaryDark : Colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        <View style={styles.columnScroll}>
          {renderItems()}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.pickerContainer,
            {
              backgroundColor: isDark
                ? Colors.backgroundDark
                : Colors.backgroundLight,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDark
                  ? Colors.borderDark
                  : Colors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary },
              ]}
            >
              Set Time
            </Text>
            <IconButton
              icon={Icons.close}
              onPress={onCancel}
              size="small"
              variant="ghost"
            />
          </View>

          <View
            style={[
              styles.pickerContent,
              {
                backgroundColor: isDark
                  ? Colors.surfaceDark
                  : Colors.surfaceLight,
              },
            ]}
          >
            <TimeColumn
              label="Hours"
              value={hours}
              onChange={setHours}
              max={23}
            />
            <TimeColumn
              label="Minutes"
              value={minutes}
              onChange={setMinutes}
              max={59}
            />
            <TimeColumn
              label="Seconds"
              value={seconds}
              onChange={setSeconds}
              max={59}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: isDark
                    ? Colors.surfaceDark
                    : Colors.surfaceLight,
                  borderColor: isDark
                    ? Colors.borderDark
                    : Colors.borderLight,
                },
              ]}
              onPress={onCancel}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.headlineSmall,
  },
  pickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  column: {
    alignItems: 'center',
    width: '30%',
  },
  columnLabel: {
    ...Typography.labelSmall,
    marginBottom: Spacing.sm,
  },
  columnScroll: {
    height: 200,
  },
  timeItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeItemActive: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    marginVertical: 4,
  },
  timeText: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonText: {
    ...Typography.titleSmall,
  },
});
