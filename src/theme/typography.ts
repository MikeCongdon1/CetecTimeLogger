import { StyleSheet } from 'react-native';

export const Typography = StyleSheet.create({
  // Display/Heading styles
  displayLarge: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  displaySmall: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },

  // Headline styles
  headlineLarge: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },

  // Title styles
  titleLarge: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Body styles
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Label styles
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Mono font (for timers, IDs, etc)
  mono: {
    fontFamily: 'Courier New',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
});
