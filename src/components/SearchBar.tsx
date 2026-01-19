import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  Text,
} from 'react-native';
import { Colors, Spacing, Icons } from '../theme';

interface SearchBarProps {
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onFilterPress?: () => void;
  value?: string;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onChangeText,
  onFilterPress,
  value,
  style,
}) => {
  const isDark = useColorScheme() === 'dark';

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
      <TextInput
        style={[
          styles.input,
          {
            color: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? Colors.textMutedDark : Colors.textMuted}
        onChangeText={onChangeText}
        value={value}
      />
      {onFilterPress && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18 }}>{Icons.search}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 0,
  },
  filterButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
});
