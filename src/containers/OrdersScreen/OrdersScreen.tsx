import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  FlatList,
  ViewStyle,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import {
  SearchBar,
  FilterChips,
  ActiveTimerCard,
  OrderCard,
  IconButton,
} from '../../components';
import { Order, OrderStatus } from '../../types';
import { Colors, Spacing, Typography, Icons } from '../../theme';
import * as tokenStorage from '../../utils/tokenStorage';
import dbService from '../../utils/database';

interface OrdersScreenProps {
  onOrderPress?: (order: Order) => void;
  onTimerPausePress?: () => void;
  onCreateOrderPress?: () => void;
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
}) => {
  const isDark = useColorScheme() === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'all'>(
    'all'
  );
  const [elapsedTime, setElapsedTime] = useState({
    hours: 0,
    minutes: 23,
    seconds: 45,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock data for active order
  const activeOrder: Order = {
    id: '4029',
    orderNumber: '4029',
    clientName: 'Smith Residence',
    service: 'HVAC Repair • Kitchen Unit',
    location: '124 Conch Street, Bikini Bottom',
    status: 'in_progress',
    elapsedTime,
    isActive: true,
  };

  // Extract fetch logic into a separate function
  const fetchOrders = useCallback(async () => {
    console.log('fetchOrders called');
    try {
      setIsLoading(true);

      // Try to get access token first, fall back to refresh token (same as handleSearch)
      let authToken = '';
      let tokens = await tokenStorage.getTokens();
      console.log('Tokens retrieved:', tokens ? 'yes' : 'no');
      if (tokens?.accessToken) {
        authToken = tokens.accessToken;
      } else {
        // Fall back to refresh token stored in database
        const refreshToken = await dbService.getSetting('refreshToken');
        console.log('Refresh token from database:', refreshToken ? 'yes' : 'no');
        if (!refreshToken) {
          console.error('Not authenticated - no access token or refresh token');
          Alert.alert('Error', 'Not authenticated. Please reconnect in Settings.');
          setIsLoading(false);
          return;
        }
        authToken = refreshToken;
      }

      // Get CetecERP URL
      const cetecUrl = await dbService.getSetting('cetecUrl');
      console.log('CetecERP URL:', cetecUrl);
      if (!cetecUrl) {
        console.error('CetecERP URL not configured');
        Alert.alert('Error', 'CetecERP URL not configured.');
        setIsLoading(false);
        return;
      }

      // Helper function to attempt fetch with token refresh on 401
      const fetchWithTokenRefresh = async (url: string, options: RequestInit, retryCount = 0): Promise<Response> => {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${authToken}`,
          },
        });

        // If 401 (Unauthorized) and we haven't retried yet, try to refresh token using cookies
        if (response.status === 401 && retryCount === 0) {
          console.log('Got 401 - attempting to refresh token from cookies');
          
          // Extract Set-Cookie headers from response
          const setCookieHeader = response.headers.get('Set-Cookie');
          if (setCookieHeader) {
            console.log('Found Set-Cookie header, attempting to extract token');
            // The cookie should be automatically stored by the browser in web mode
            // For React Native, we'd need to parse and store manually
            
            // Retry the request with new auth attempt
            return fetchWithTokenRefresh(url, options, retryCount + 1);
          }
        }

        return response;
      };

      // Get user info - first extract user ID from the access token or fetch from /user/me
      console.log('Fetching user info from:', `${cetecUrl}/goapis/api/v1/user/me`);
      const userResponse = await fetchWithTokenRefresh(`${cetecUrl}/goapis/api/v1/user/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('User response status:', userResponse.status);
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('User response error:', errorText);
        throw new Error('Failed to fetch user information');
      }

      const userData = await userResponse.json();
      console.log('User data:', userData);
      const data = userData.data || {};
      const currentUserId = data.id || data.userId;

      if (!currentUserId) {
        throw new Error('Could not determine user ID');
      }

      setUserId(currentUserId);

      // Fetch workflow tasks for the user
      console.log('Fetching tasks for user:', currentUserId);
      console.log('Task URL:', `${cetecUrl}/goapis/api/v1/user/${currentUserId}/task/list/submit`);
      const taskResponse = await fetchWithTokenRefresh(
        `${cetecUrl}/goapis/api/v1/user/${currentUserId}/task/list/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filters: {
              from_date: '',
              to_date: '',
              user_id: currentUserId,
              initial_state: false,
              object_type: ['Ordline'],
            },
            sort: {},
            pagination: {
              current_page: 1,
              records_per_page: 25,
              no_limit: false,
            },
          }),
        }
      );
      console.log('Task response status:', taskResponse.status);
      if (!taskResponse.ok) {
        const errorText = await taskResponse.text();
        console.error('Task response error:', errorText);
        throw new Error(`Failed to fetch tasks: ${taskResponse.status}`);
      }

      const taskData: WorkflowTaskResponse = await taskResponse.json();
      console.log('Task data received:', taskData);

      if (taskData.error && taskData.error.length > 0) {
        console.warn('API errors:', taskData.error);
      }

      // Transform workflow tasks to Order objects
      const transformedOrders: Order[] = (taskData.data?.data || []).map(
        (task: WorkflowTask) => {
          // Map order data according to requirements:
          // - object_desc (or object_name if blank) maps to clientName (like 'Smith Residence')
          // - comments maps to service (like 'AC Maintenance & Filter Replacement')
          // - object_name becomes the order number with object_id in parentheses
          // - workflow_state determines status

          const clientName = task.object_desc || task.object;
          const service = task.comments || task.workflow_comments || '';
          const orderNumberWithId = `${task.object_name} (${task.object_id})`;
          
          // Map workflow_state to order status
          let status: OrderStatus = 'pending';
          if (task.workflow_state === 'In Progress' || task.workflow_state === 'In-Progress') {
            status = 'in_progress';
          } else if (task.workflow_state === 'Completed' || task.workflow_state === 'Complete') {
            status = 'completed';
          }

          return {
            id: task.object_id.toString(),
            orderNumber: orderNumberWithId,
            clientName: clientName,
            service: service || 'Work Order',
            location: `${task.workflow_state} • ${task.assigned_at ? new Date(task.assigned_at).toLocaleDateString() : 'N/A'}`,
            status: status,
          };
        }
      );

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Track app state changes to refetch when user returns to the screen
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove?.();
    };
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      // App came to foreground, refetch orders
      fetchOrders();
    }
  };

  // Perform global search API call with debouncing
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      // If search is cleared, show all orders
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

      // Try to get access token first, fall back to refresh token
      let authToken = '';
      const tokens = await tokenStorage.getTokens();
      if (tokens?.accessToken) {
        authToken = tokens.accessToken;
      } else {
        // Fall back to refresh token stored in database
        const refreshToken = await dbService.getSetting('refreshToken');
        if (!refreshToken) {
          console.error('Not authenticated - no access token or refresh token');
          Alert.alert('Error', 'Not authenticated. Please reconnect in Settings.');
          setIsSearching(false);
          return;
        }
        authToken = refreshToken;
      }

      const cetecUrl = await dbService.getSetting('cetecUrl');
      if (!cetecUrl) {
        console.error('CetecERP URL not configured');
        Alert.alert('Error', 'CetecERP URL not configured in Settings.');
        setIsSearching(false);
        return;
      }

      console.log('Performing search for:', query, 'at URL:', cetecUrl);

      // Helper function to attempt fetch with token refresh on 401
      const fetchWithTokenRefresh = async (url: string, options: RequestInit, retryCount = 0): Promise<Response> => {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${authToken}`,
          },
        });

        // If 401 (Unauthorized) and we haven't retried yet, try to refresh token using cookies
        if (response.status === 401 && retryCount === 0) {
          console.log('Got 401 - attempting to refresh token from cookies');
          
          // Extract Set-Cookie headers from response
          const setCookieHeader = response.headers.get('Set-Cookie');
          if (setCookieHeader) {
            console.log('Found Set-Cookie header, attempting to extract token');
            // The cookie should be automatically stored by the browser in web mode
            // For React Native, we'd need to parse and store manually
            
            // Retry the request with new auth attempt
            return fetchWithTokenRefresh(url, options, retryCount + 1);
          }
        }

        return response;
      };

      // Call global search endpoint with query as URL parameter
      const searchUrl = new URL(`${cetecUrl}/goapis/api/v1/global_search`);
      searchUrl.searchParams.append('value', query);

      const searchResponse = await fetchWithTokenRefresh(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Search response status:', searchResponse.status);

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Search failed:', searchResponse.status, errorText);
        throw new Error(`Search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      console.log('Search data received:', searchData);
      
      // Transform search results to Order objects if they're ordlines
      const transformedResults: Order[] = (searchData.results || searchData.data || [])
        .filter((result: any) => result.object_type === 'Ordline')
        .map((result: any) => ({
          id: result.object_id?.toString() || result.id,
          orderNumber: `${result.object_name} (${result.object_id})`,
          clientName: result.object_desc || result.object || result.name,
          service: result.comments || result.description || 'Work Order',
          location: result.object_notes || '',
          status: 'pending' as OrderStatus,
        }));

      console.log('Transformed results:', transformedResults);
      setSearchResults(transformedResults);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const filterOptions = ['All', 'Pending', 'In Progress', 'Completed'];

  // Use search results if actively searching, otherwise use local filter on orders
  const displayOrders = searchQuery.trim() ? searchResults : orders;
  
  const filteredOrders = displayOrders.filter((order) => {
    // If search is active, results are already filtered from API
    if (searchQuery.trim()) {
      if (selectedFilter === 'all') return true;

      const statusMap: Record<string, OrderStatus> = {
        'In Progress': 'in_progress',
        Pending: 'pending',
        Completed: 'completed',
      };

      return order.status === statusMap[selectedFilter];
    }

    // Local filtering for non-search results
    if (selectedFilter === 'all') return true;

    const statusMap: Record<string, OrderStatus> = {
      'In Progress': 'in_progress',
      Pending: 'pending',
      Completed: 'completed',
    };

    return order.status === statusMap[selectedFilter];
  });

  const handleOrderPress = useCallback(
    (order: Order) => {
      onOrderPress?.(order);
    },
    [onOrderPress]
  );

  const handleOrderAction = useCallback(
    (order: Order) => {
      console.log('Action pressed for order:', order.id);
      // Handle play/pause action
    },
    []
  );

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
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark
              ? Colors.backgroundDark
              : Colors.backgroundLight,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <IconButton icon={Icons.menu} onPress={() => {}} variant="ghost" />
          <Text
            style={[
              styles.headerTitle,
              {
                color: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
              },
            ]}
          >
            Time Logger
          </Text>
          <View style={styles.headerActions}>
          </View>
        </View>

        {/* Active Timer Card */}
        <View style={styles.activeTimerSection}>
          <ActiveTimerCard
            order={activeOrder}
            ordlineId={Number(activeOrder.id)}
            assignedUserId={userId || 0}
            onPausePress={onTimerPausePress}
            onTimeChange={setElapsedTime}
          />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Search and Filter */}
        <View style={styles.searchSection}>
          <SearchBar
            placeholder="Search by ID or Client name..."
            value={searchQuery}
            onChangeText={handleSearch}
            onFilterPress={() => {}}
          />
          <FilterChips
            chips={filterOptions}
            selectedChip={
              selectedFilter === 'all'
                ? 'All'
                : selectedFilter
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')
            }
            onChipPress={(chip) => {
              console.log('Chip pressed:', chip);
              if (chip === 'All') {
                setSelectedFilter('all');
              } else {
                const statusMap: Record<string, OrderStatus> = {
                  'In Progress': 'in_progress',
                  Pending: 'pending',
                  Completed: 'completed',
                };
                setSelectedFilter(statusMap[chip]);
              }
              // Retrigger the orders fetch when filter chip is clicked
              console.log('About to call fetchOrders from chip click');
              fetchOrders();
            }}
            style={styles.filterChips}
          />
        </View>

        {/* Orders List */}
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text
              style={[
                styles.emptyStateText,
                {
                  color: isDark
                    ? Colors.textSecondaryDark
                    : Colors.textSecondary,
                  marginTop: Spacing.md,
                },
              ]}
            >
              Loading orders...
            </Text>
          </View>
        ) : filteredOrders.length > 0 ? (
          <>
            <View style={styles.ordersSection}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
                    },
                  ]}
                >
                  Your Orders
                </Text>
                <Text style={styles.viewAllButton}>View All</Text>
              </View>

              <View>
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => handleOrderPress(order)}
                    onActionPress={() => handleOrderAction(order)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.flexSpacer} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyStateText,
                {
                  color: isDark
                    ? Colors.textSecondaryDark
                    : Colors.textSecondary,
                },
              ]}
            >
              No orders found
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.headlineSmall,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  activeTimerSection: {
    marginTop: Spacing.md,
  },
  content: {
    flex: 1,
    flexGrow: 1,
  },
  contentContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  searchSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  filterChips: {
    marginTop: Spacing.md,
  },
  ordersSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headlineSmall,
  },
  viewAllButton: {
    color: Colors.primary,
    ...Typography.titleSmall,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
    width: '100%',
  },
  emptyStateText: {
    ...Typography.bodyMedium,
  },
  flexSpacer: {
    flex: 1,
  },
});
