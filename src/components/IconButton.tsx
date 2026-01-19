import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ViewStyle,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'medium',
  variant = 'secondary',
  disabled = false,
  loading = false,
  style,
}) => {
  const isDark = useColorScheme() === 'dark';

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 32, fontSize: 16 };
      case 'large':
        return { width: 56, height: 56, fontSize: 28 };
      default:
        return { width: 40, height: 40, fontSize: 20 };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.primary,
          tintColor: 'white',
          shadowOpacity: 0.4,
          shadowRadius: 8,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          tintColor: isDark ? Colors.textPrimaryDark : Colors.textSecondary,
        };
      default:
        return {
          backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
          tintColor: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
          borderColor: isDark ? Colors.borderDark : Colors.borderLight,
          borderWidth: 1,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: sizeStyles.width,
          height: sizeStyles.height,
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor || 'transparent',
          borderWidth: variantStyles.borderWidth || 0,
          ...(variant === 'primary' && {
            shadowColor: Colors.primary,
            shadowOpacity: variantStyles.shadowOpacity,
            shadowRadius: variantStyles.shadowRadius,
            elevation: 4,
          }),
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.tintColor} />
      ) : (
        <Text
          style={{
            fontSize: sizeStyles.fontSize,
            color: variantStyles.tintColor,
          }}
        >
          {icon}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});
