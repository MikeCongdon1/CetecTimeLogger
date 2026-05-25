import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  AppState,
  TouchableOpacity,
} from 'react-native';
import {
  OrderCard,
  SmartOmniBar,
} from '../../components';
import { Order, OrderStatus } from '../../types';
import { Colors, Spacing, Typography } from '../../theme';
import * as tokenStorage from '../../utils/tokenStorage';
import dbService from '../../utils/database';

interface OrdersScreenProps {
  onOrderPress?: (order: Order) => void;
  onTimerPausePress?: () => void;
  onCreateOrderPress?: () => void;
  recentlyLogged?: Order[];
}

interface WorkflowTaskResponse {
  error: any[];
  data: {
    data: WorkflowTask[];
    pagination: {
      total_records: number;
      current_page: number;
      records_per_page: number;
    };
  };
  statusCode: number;
}

interface WorkflowTask {
  assigned_at: string;
  assigned_by: string;
  comments: string;
  due_date: string;
  object: string;
  object_desc: string;
  object_id: number;
  object_name: string;
  object_notes: string;
  object_type: string;
  url: string;
  user: string;
  workflow_comments: string;
  workflow_state: string;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  onOrderPress,
  onTimerPausePress,
  onCreateOrderPress,
  recentlyLogged = [],
}) => {
  const isDark = useColorScheme() === 'dark';

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);

      let authToken = '';
      let tokens = await tokenStorage.getTokens();
      if (tokens?.accessToken) {
        authToken = tokens.accessToken;
      } else {
        const refreshToken = await dbService.getSetting('refreshToken');
        if (!refreshToken) {
          Alert.alert('Error', 'Not authenticated. Please reconnect in Settings.');
          setIsLoading(false);
          return;
        }
        authToken = refreshToken;
      }

      const cetecUrl = await dbService.getSetting('cetecUrl');
      if (!cetecUrl) {
        Alert.alert('Error', 'CetecERP URL not configured.');
        setIsLoading(false);
        return;
      }

      const fetchWithAuth = async (url: string, options: RequestInit): Promise<Response> => {
        return fetch(url, {
          ...options,
          headers: { ...options.headers, 'Authorization': `Bearer ${authToken}` },
        });
      };

      const userResponse = await fetchWithAuth(`${cetecUrl}/goapis/api/v1/user/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!userResponse.ok) throw new Error('Failed to fetch user information');

      const userData = await userResponse.json();
      const data = userData.data || {};
      const currentUserId = data.id || data.userId;
      if (!currentUserId) throw new Error('Could not determine user ID');

      setUserId(currentUserId);

      const taskResponse = await fetchWithAuth(
        `${cetecUrl}/goapis/api/v1/user/${currentUserId}/task/list/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              from_date: '',
              to_date: '',
              user_id: currentUserId,
              initial_state: false,
              object_type: ['Ordline'],
            },
            sort: {},
            pagination: { current_page: 1, records_per_page: 50, no_limit: false },
          }),
        }
      );

      if (!taskResponse.ok) throw new Error(`Failed to fetch tasks: ${taskResponse.status}`);

      const taskData: WorkflowTaskResponse = await taskResponse.json();

      const transformedOrders: Order[] = (taskData.data?.data || []).map((task: WorkflowTask) => {
        let status: OrderStatus = 'pending';
        if (task.workflow_state === 'In Progress' || task.workflow_state === 'In-Progress') {
          status = 'in_progress';
        } else if (task.workflow_state === 'Completed' || task.workflow_state === 'Complete') {
          status = 'completed';
        }
        return {
          id: task.object_id.toString(),
          orderNumber: `${task.object_name} (${task.object_id})`,
          clientName: task.object_desc || task.object,
          service: task.comments || task.workflow_comments || 'Work Order',
          location: `${task.workflow_state} • ${task.assigned_at ? new Date(task.assigned_at).toLocaleDateString() : 'N/A'}`,
          status,
        };
      });

      setOrders(transformedOrders);
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchOrders();
    });
    return () => subscription?.remove?.();
  }, [fetchOrders]);


  // Split orders: in-progress first, then pending, exclude completed from primary view
  const inProgressOrders = orders.filter(o => o.status === 'in_progress');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const myTaskOrders = [...inProgressOrders, ...pendingOrders];

  const bg = isDark ? Colors.backgroundDark : Colors.backgroundLight;
  const surface = isDark ? Colors.surfaceDark : Colors.surfaceLight;
  const textPrimary = isDark ? Colors.textPrimaryDark : Colors.textPrimary;
  const textMuted = isDark ? Colors.textMutedDark : Colors.textMuted;
  const border = isDark ? Colors.borderDark : Colors.borderLight;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: border }]}>
        <View style={styles.normalHeader}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Time Logger</Text>
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: border }]}
            onPress={fetchOrders}
          >
            <Text style={[styles.refreshIcon, { color: textMuted }]}>↺</Text>
          </TouchableOpacity>
        </View>
        <SmartOmniBar
          orders={orders}
          recentlyLogged={recentlyLogged}
          onOrderSelect={(order, workType, durationHours) => {
            onOrderPress?.(order);
          }}
          isDark={isDark}
        />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.stateText, { color: textMuted, marginTop: Spacing.md }]}>Loading tasks...</Text>
          </View>
        ) : (
          <>
            {/* ── RECENTLY LOGGED ── */}
            {recentlyLogged.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: textMuted }]}>RECENTLY LOGGED</Text>
                </View>
                {recentlyLogged.map(order => (
                  <RecentOrderCard
                    key={`recent-${order.id}`}
                    order={order}
                    onPress={() => onOrderPress?.(order)}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}

            {/* ── MY TASKS ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textMuted }]}>MY TASKS</Text>
                {myTaskOrders.length > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.countBadgeText}>{myTaskOrders.length}</Text>
                  </View>
                )}
              </View>

              {myTaskOrders.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: border }]}>
                  <Text style={[styles.emptyCardText, { color: textMuted }]}>
                    No tasks assigned to you
                  </Text>
                  <Text style={[styles.emptyCardSub, { color: textMuted }]}>
                    Use the search bar above to find orders
                  </Text>
                </View>
              ) : (
                myTaskOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => onOrderPress?.(order)}
                    onActionPress={() => onOrderPress?.(order)}
                  />
                ))
              )}
            </View>

            {/* ── OTHER (COMPLETED) ── */}
            {orders.filter(o => o.status === 'completed').length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: textMuted }]}>COMPLETED</Text>
                </View>
                {orders.filter(o => o.status === 'completed').map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => onOrderPress?.(order)}
                    onActionPress={() => onOrderPress?.(order)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Compact card for recently logged items
interface RecentOrderCardProps {
  order: Order;
  onPress: () => void;
  isDark: boolean;
}

const RecentOrderCard: React.FC<RecentOrderCardProps> = ({ order, onPress, isDark }) => {
  const surface = isDark ? Colors.surfaceDark : Colors.surfaceLight;
  const border = isDark ? Colors.borderDark : Colors.borderLight;
  const textPrimary = isDark ? Colors.textPrimaryDark : Colors.textPrimary;
  const textMuted = isDark ? Colors.textMutedDark : Colors.textMuted;

  return (
    <TouchableOpacity
      style={[styles.recentCard, { backgroundColor: surface, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.recentAccent, { backgroundColor: Colors.primary }]} />
      <View style={styles.recentContent}>
        <Text style={[styles.recentClient, { color: textPrimary }]} numberOfLines={1}>
          {order.clientName}
        </Text>
        <Text style={[styles.recentService, { color: textMuted }]} numberOfLines={1}>
          {order.service}
        </Text>
      </View>
      <View style={[styles.recentAction, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary + '40' }]}>
        <Text style={[styles.recentActionText, { color: Colors.primary }]}>+ Log</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  normalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.headlineSmall,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: { flex: 1 },
  contentContainer: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  stateText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyCardText: {
    ...Typography.bodyMedium,
    fontWeight: '500',
  },
  emptyCardSub: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  // Recent card
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  recentAccent: {
    width: 3,
    alignSelf: 'stretch',
  },
  recentContent: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  recentClient: {
    ...Typography.titleSmall,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentService: {
    ...Typography.bodySmall,
  },
  recentAction: {
    marginRight: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  recentActionText: {
    ...Typography.labelSmall,
    fontWeight: '700',
  },
});
