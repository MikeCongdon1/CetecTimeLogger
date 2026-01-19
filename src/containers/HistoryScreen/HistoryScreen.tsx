import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
} from 'react-native';
import { Colors, Typography } from '../../theme';

export const HistoryScreen: React.FC = () => {
  const isDark = useColorScheme() === 'dark';

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? Colors.backgroundDark
            : Colors.backgroundLight,
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary },
          ]}
        >
          History
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: isDark ? Colors.textSecondaryDark : Colors.textSecondary,
            },
          ]}
        >
          View past time entries
        </Text>
      </View>

      <View
        style={[
          styles.placeholder,
          {
            backgroundColor: isDark
              ? Colors.surfaceDark
              : Colors.surfaceLight,
          },
        ]}
      >
        <Text
          style={[
            styles.placeholderText,
            {
              color: isDark ? Colors.textSecondaryDark : Colors.textSecondary,
            },
          ]}
        >
          Time entry history will appear here
        </Text>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    ...Typography.headlineLarge,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
    minHeight: 300,
  },
  placeholderText: {
    ...Typography.bodyMedium,
  },
});
