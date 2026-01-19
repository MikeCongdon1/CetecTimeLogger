import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing } from '../theme';

interface TimerDisplayProps {
  hours: number;
  minutes: number;
  seconds: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  hours,
  minutes,
  seconds,
  size = 'medium',
  style,
}) => {
  const isDark = useColorScheme() === 'dark';

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 16, height: 32 };
      case 'large':
        return { fontSize: 32, height: 56 };
      default:
        return { fontSize: 24, height: 44 };
    }
  };

  const sizeStyles = getSizeStyles();
  const pad = (num: number) => String(num).padStart(2, '0');

  return (
    <View style={[styles.container, style]}>
      <View style={styles.timeUnitContainer}>
        <View
          style={[
            styles.timeBox,
            { height: sizeStyles.height },
            {
              backgroundColor: isDark ? '#111a22' : '#f3f4f6',
              borderColor: isDark ? Colors.borderDark : Colors.borderLight,
            },
          ]}
        >
          <Text
            style={[
              styles.timeText,
              { fontSize: sizeStyles.fontSize },
              {
                color: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
              },
            ]}
          >
            {pad(hours)}
          </Text>
        </View>
        <Text
          style={[
            styles.unitLabel,
            { color: isDark ? Colors.textMutedDark : Colors.textMuted },
          ]}
        >
          Hrs
        </Text>
      </View>

      <Text
        style={[
          styles.separator,
          { color: isDark ? Colors.textMutedDark : Colors.textMuted },
        ]}
      >
        :
      </Text>

      <View style={styles.timeUnitContainer}>
        <View
          style={[
            styles.timeBox,
            { height: sizeStyles.height },
            {
              backgroundColor: isDark ? '#111a22' : '#f3f4f6',
              borderColor: isDark ? Colors.borderDark : Colors.borderLight,
            },
          ]}
        >
          <Text
            style={[
              styles.timeText,
              { fontSize: sizeStyles.fontSize },
              {
                color: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
              },
            ]}
          >
            {pad(minutes)}
          </Text>
        </View>
        <Text
          style={[
            styles.unitLabel,
            { color: isDark ? Colors.textMutedDark : Colors.textMuted },
          ]}
        >
          Min
        </Text>
      </View>

      <Text
        style={[
          styles.separator,
          { color: isDark ? Colors.textMutedDark : Colors.textMuted },
        ]}
      >
        :
      </Text>

      <View style={styles.timeUnitContainer}>
        <View
          style={[
            styles.timeBox,
            styles.secondsBox,
            { height: sizeStyles.height },
            {
              backgroundColor: isDark ? '#111a22' : '#f3f4f6',
              borderColor: isDark ? Colors.borderDark : Colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.secondsProgress,
              { height: Math.max(4, sizeStyles.height * 0.1) },
            ]}
          />
          <Text
            style={[
              styles.timeText,
              { fontSize: sizeStyles.fontSize },
              { color: Colors.primary },
            ]}
          >
            {pad(seconds)}
          </Text>
        </View>
        <Text
          style={[
            styles.unitLabel,
            { color: isDark ? Colors.textMutedDark : Colors.textMuted },
          ]}
        >
          Sec
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  timeUnitContainer: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeBox: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  secondsBox: {
    position: 'relative',
  },
  secondsProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  timeText: {
    fontWeight: '700',
    fontFamily: 'Courier New',
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  unitLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
