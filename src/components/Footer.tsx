import React from 'react';
import {
  View, StyleSheet, useColorScheme,
} from 'react-native';
import { IconButton } from './IconButton';
import { Colors, Icons } from '../theme';

export type FooterScreen = 'orders' | 'history' | 'settings';

interface FooterProps {
  currentScreen: FooterScreen;
  onNavigate: (screen: FooterScreen) => void;
  onCreatePress?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentScreen,
  onNavigate,
  onCreatePress,
}) => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: isDarkMode
            ? Colors.surfaceDark
            : Colors.surfaceLight,
          borderTopColor: isDarkMode
            ? Colors.borderDark
            : Colors.borderLight,
        },
      ]}
    >
      <IconButton
        icon={Icons.orders}
        onPress={() => onNavigate('orders')}
        size="medium"
        variant={currentScreen === 'orders' ? 'primary' : 'ghost'}
      />
      <IconButton
        icon={Icons.history}
        onPress={() => onNavigate('history')}
        size="medium"
        variant={currentScreen === 'history' ? 'primary' : 'ghost'}
      />
      <IconButton
        icon={Icons.create}
        onPress={onCreatePress || (() => {})}
        size="large"
        variant="primary"
      />
      <IconButton
        icon={Icons.settings}
        onPress={() => onNavigate('settings')}
        size="medium"
        variant={currentScreen === 'settings' ? 'primary' : 'ghost'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 80,
    borderTopWidth: 1,
    paddingBottom: 12,
    flexShrink: 0,
  },
});
