/**
 * CetecTimeLogger - Time Logging Mobile App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, useColorScheme, Modal, Linking,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  OrdersScreen, CommentEditorScreen, NewSegmentScreen, HistoryScreen, SettingsScreen,
} from './src/containers';
import { Footer } from './src/components';
import { Colors, Icons } from './src/theme';
import { Order, CommentContextData } from './src/types';
import { SegmentData } from './src/containers/NewSegmentScreen/NewSegmentScreen';

type Screen = 'orders' | 'history' | 'settings';

interface OAuthDeepLinkData {
  shortCode: string;
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentScreen, setCurrentScreen] = useState<Screen>('orders');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCommentEditor, setShowCommentEditor] = useState(false);
  const [showNewSegment, setShowNewSegment] = useState(false);
  const [oauthDeepLinkData, setOAuthDeepLinkData] = useState<OAuthDeepLinkData | null>(null);

  // Handle deep links from CetecERP OAuth flow
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      // Parse deep link: cetec://oauth/ABC123DEF456
      const match = url.match(/cetec:\/\/oauth\/(.+)/);
      if (match) {
        const shortCode = match[1];
        console.log('OAuth deep link received:', shortCode);
        
        // Store the code and navigate to settings
        setOAuthDeepLinkData({ shortCode });
        setCurrentScreen('settings');
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url != null) {
        handleDeepLink({ url });
      }
    });

    // Listen for URL changes while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setShowCommentEditor(true);
  };

  const handleCommentSave = (comment: string, tags: string[]) => {
    // TODO: Save comment to API/context
    console.log('Comment saved:', { comment, tags });
    setShowCommentEditor(false);
    setSelectedOrder(null);
  };

  const handleCloseCommentEditor = () => {
    setShowCommentEditor(false);
    setSelectedOrder(null);
  };

  const handleCreateOrder = () => {
    setShowNewSegment(true);
  };

  const handleSegmentSave = (segmentData: SegmentData) => {
    // TODO: Save segment to API/context
    console.log('Segment saved:', segmentData);
    setShowNewSegment(false);
  };

  const handleCloseNewSegment = () => {
    setShowNewSegment(false);
  };

  const handleTimerPause = () => {
    console.log('Timer paused');
    // TODO: Pause active timer
  };

  const commentContextData: CommentContextData | null = selectedOrder
    ? {
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        title: selectedOrder.clientName,
        elapsedTime: selectedOrder.elapsedTime || {
          hours: 0,
          minutes: 0,
          seconds: 0,
        },
      }
    : null;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'orders':
        return (
          <OrdersScreen
            onOrderPress={handleOrderPress}
            onCreateOrderPress={handleCreateOrder}
            onTimerPausePress={handleTimerPause}
          />
        );
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen oauthDeepLinkData={oauthDeepLinkData} />;
      default:
        return (
          <OrdersScreen
            onOrderPress={handleOrderPress}
            onCreateOrderPress={handleCreateOrder}
            onTimerPausePress={handleTimerPause}
          />
        );
    }
  };

  return (
    <SafeAreaProvider style={{ flex: 1, height: '100%', maxHeight: '100vh' }}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDarkMode
              ? Colors.backgroundDark
              : Colors.backgroundLight,
          },
        ]}
      >
        {/* Main Screen Content */}
        <View style={styles.screenContainer}>{renderScreen()}</View>

        {/* Footer Navigation */}
        <Footer
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          onCreatePress={handleCreateOrder}
        />
      </View>

      {/* Comment Editor Modal */}
      <Modal
        visible={showCommentEditor}
        animationType="slide"
        onRequestClose={handleCloseCommentEditor}
      >
        {commentContextData && (
          <CommentEditorScreen
            contextData={commentContextData}
            onSavePress={handleCommentSave}
            onClosePress={handleCloseCommentEditor}
          />
        )}
      </Modal>

      {/* New Segment Modal */}
      <Modal
        visible={showNewSegment}
        animationType="slide"
        onRequestClose={handleCloseNewSegment}
      >
        <NewSegmentScreen
          onSavePress={handleSegmentSave}
          onClosePress={handleCloseNewSegment}
        />
      </Modal>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  screenContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
});

export default App;
