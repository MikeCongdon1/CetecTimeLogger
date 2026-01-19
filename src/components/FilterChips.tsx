import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing } from '../theme';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
}) => {
  const isDark = useColorScheme() === 'dark';

  const backgroundColor = selected ? Colors.primary : (isDark ? Colors.surfaceDark : Colors.surfaceLight);
  const textColor = selected ? '#ffffff' : (isDark ? Colors.textPrimaryDark : Colors.textPrimary);
  const borderColor = selected ? Colors.primary : (isDark ? Colors.borderDark : Colors.borderLight);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface FilterChipsProps {
  chips: string[];
  selectedChip?: string;
  onChipPress?: (chip: string) => void;
  style?: ViewStyle;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  chips,
  selectedChip,
  onChipPress,
  style,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
    >
      {chips.map((chip) => (
        <FilterChip
          key={chip}
          label={chip}
          selected={selectedChip === chip}
          onPress={() => onChipPress?.(chip)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  contentContainer: {
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
