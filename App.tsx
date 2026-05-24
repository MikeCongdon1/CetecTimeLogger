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
import dbService from './src/utils/database';

type Screen = 'orders' | 'history' | 'settings';

const RECENTLY_LOGGED_KEY = 'recentlyLoggedOrders';
const MAX_RECENT = 8;

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
  const [recentlyLogged, setRecentlyLogged] = useState<Order[]>([]);

  // Load recently logged from IndexedDB on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await dbService.getSetting(RECENTLY_LOGGED_KEY);
        if (stored) {
          setRecentlyLogged(JSON.parse(stored));
        }
      } catch {
        // ignore parse errors
      }
    })();
  }, []);

  const addToRecentlyLogged = async (order: Order) => {
    setRecentlyLogged(prev => {
      // Dedupe by id, put newest first, cap at MAX_RECENT
      const filtered = prev.filter(o => o.id !== order.id);
      const updated = [order, ...filtered].slice(0, MAX_RECENT);
      dbService.setSetting(RECENTLY_LOGGED_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  // Handle deep links from CetecERP OAuth flow
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      const match = url.match(/cetec:\/\/oauth\/(.+)/);
      if (match) {
        setOAuthDeepLinkData({ shortCode: match[1] });
        setCurrentScreen('settings');
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url != null) handleDeepLink({ url });
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setShowCommentEditor(true);
  };

  const handleCommentSave = (comment: string, tags: string[]) => {
    // selectedOrder is still set here — persist it as recently logged
    if (selectedOrder) {
      addToRecentlyLogged(selectedOrder);
    }
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
    console.log('Segment saved:', segmentData);
    setShowNewSegment(false);
  };

  const handleCloseNewSegment = () => {
    setShowNewSegment(false);
  };

  const commentContextData: CommentContextData | null = selectedOrder
    ? {
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        title: selectedOrder.clientName,
        elapsedTime: selectedOrder.elapsedTime || { hours: 0, minutes: 0, seconds: 0 },
      }
    : null;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'orders':
        return (
          <OrdersScreen
            onOrderPress={handleOrderPress}
            onCreateOrderPress={handleCreateOrder}
            onTimerPausePress={() => {}}
            recentlyLogged={recentlyLogged}
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
            onTimerPausePress={() => {}}
            recentlyLogged={recentlyLogged}
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
            backgroundColor: isDarkMode ? Colors.backgroundDark : Colors.backgroundLight,
          },
        ]}
      >
        <View style={styles.screenContainer}>{renderScreen()}</View>

        <Footer
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          onCreatePress={handleCreateOrder}
        />
      </View>

      {/* Log Time Modal */}
      <Modal
        visible={showCommentEditor}
        animationType="slide"
        onRequestClose={handleCloseCommentEditor}
      >
        {commentContextData && selectedOrder && (
          <CommentEditorScreen
            contextData={commentContextData}
            ordlineId={parseInt(selectedOrder.id, 10)}
            assignedUserId={0}
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
