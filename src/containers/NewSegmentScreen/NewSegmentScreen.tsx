import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import {
  IconButton,
  Badge,
  FilterChips,
} from '../../components';
import { Order, OrderStatus } from '../../types';
import { Colors, Spacing, Typography, Icons } from '../../theme';

interface NewSegmentScreenProps {
  onSavePress?: (segmentData: SegmentData) => void;
  onClosePress?: () => void;
}

export interface SegmentData {
  orderId: string;
  orderNumber: string;
  startTime: string;
  endTime: string;
  duration: string;
  notes: string;
  tags: string[];
}

const QUICK_TAGS = ['Meeting', 'Bug Fix', 'Travel', 'Review', 'Research', 'Internal'];

// Mock data - replace with API call
const AVAILABLE_ORDERS: Order[] = [
  {
    id: '4029',
    orderNumber: '4029',
    clientName: 'Smith Residence',
    service: 'AC Maintenance & Filter Replacement',
    location: '124 Conch Street, Bikini Bottom',
    status: 'in_progress',
    isActive: true,
  },
  {
    id: '4030',
    orderNumber: '4030',
    clientName: 'Doe Enterprise',
    service: 'Server Room Cooling Inspection',
    location: '892 Industrial Park Dr.',
    status: 'pending',
  },
  {
    id: '4031',
    orderNumber: '4031',
    clientName: 'Wayne Manor',
    service: 'Security System Wiring',
    location: '1007 Mountain Drive',
    status: 'pending',
  },
  {
    id: '4028',
    orderNumber: '4028',
    clientName: 'Stark Tower',
    service: 'Arc Reactor Calibration',
    location: '123 Stark Industries',
    status: 'completed',
  },
  {
    id: '4027',
    orderNumber: '4027',
    clientName: 'Wayne Enterprises',
    service: 'Building Security System Installation',
    location: '1007 Mountain Drive, Gotham',
    status: 'in_progress',
  },
  {
    id: '4026',
    orderNumber: '4026',
    clientName: 'Lexcorp',
    service: 'Network Infrastructure Setup',
    location: '123 Corp Plaza, Metropolis',
    status: 'pending',
  },
  {
    id: '4025',
    orderNumber: '4025',
    clientName: 'Queen Consolidated',
    service: 'Cloud Migration Services',
    location: '500 Queen St, Star City',
    status: 'in_progress',
  },
];

export const NewSegmentScreen: React.FC<NewSegmentScreenProps> = ({
  onSavePress,
  onClosePress,
}) => {
  const isDark = useColorScheme() === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('12:30');
  const [endTime, setEndTime] = useState('14:00');
  const [notesText, setNotesText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);

  const MAX_NOTES = 500;

  // Global search across all orders
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return AVAILABLE_ORDERS.filter(
      (order) =>
        order.orderNumber.includes(query) ||
        order.clientName.toLowerCase().includes(query) ||
        order.service.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleTagPress = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
    setSearchQuery('');
    setShowSearchModal(false);
  };

  const handleSave = () => {
    if (!selectedOrder) {
      alert('Please select an order');
      return;
    }

    const segmentData: SegmentData = {
      orderId: selectedOrder.id,
      orderNumber: selectedOrder.orderNumber,
      startTime,
      endTime,
      duration: calculateDuration(startTime, endTime),
      notes: notesText,
      tags: selectedTags,
    };

    onSavePress?.(segmentData);
  };

  const calculateDuration = (start: string, end: string): string => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = Math.max(0, endMinutes - startMinutes);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClosePress}>
          <Text style={[styles.headerButton, { color: Colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Segment</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.headerButton, { color: Colors.primary }]}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Order/Project Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: isDark ? Colors.text : Colors.textDark }]}>
            Order / Project
          </Text>
          <TouchableOpacity
            style={[
              styles.selectButton,
              {
                backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
                borderColor: selectedOrder ? Colors.primary : Colors.borderColor,
              },
            ]}
            onPress={() => setShowSearchModal(true)}
          >
            {selectedOrder ? (
              <View style={styles.selectedOrderContent}>
                <View>
                  <Text style={[styles.selectedOrderNumber, { color: isDark ? Colors.text : Colors.textDark }]}>
                    Order #{selectedOrder.orderNumber}
                  </Text>
                  <Text style={[styles.selectedOrderClient, { color: Colors.textSecondary }]}>
                    {selectedOrder.clientName}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderContent}>
                <View style={[styles.searchIcon, { backgroundColor: isDark ? Colors.borderColor : Colors.backgroundLight }]}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 20 }}>🔍</Text>
                </View>
                <Text style={[styles.placeholderText, { color: Colors.textSecondary }]}>
                  Select a project...
                </Text>
              </View>
            )}
            <Text style={{ color: Colors.textSecondary, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Time Inputs */}
        <View style={styles.timeSection}>
          <View style={styles.timeInputGroup}>
            <Text style={[styles.label, { color: isDark ? Colors.text : Colors.textDark }]}>
              Start
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
                  color: isDark ? Colors.text : Colors.textDark,
                  borderColor: Colors.borderColor,
                },
              ]}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:MM"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.timeInputGroup}>
            <Text style={[styles.label, { color: isDark ? Colors.text : Colors.textDark }]}>
              End
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
                  color: isDark ? Colors.text : Colors.textDark,
                  borderColor: Colors.borderColor,
                },
              ]}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:MM"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.durationBox}>
            <Text style={[styles.label, { color: isDark ? Colors.text : Colors.textDark }]}>
              Duration
            </Text>
            <View
              style={[
                styles.durationValue,
                { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
              ]}
            >
              <Text style={[styles.durationText, { color: Colors.primary }]}>
                {calculateDuration(startTime, endTime)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Tags */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: isDark ? Colors.text : Colors.textDark }]}>
            Quick Tags
          </Text>
          <View style={styles.tagsContainer}>
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagButton,
                  {
                    backgroundColor: selectedTags.includes(tag) ? Colors.primary : (isDark ? Colors.surfaceDark : Colors.surfaceLight),
                    borderColor: selectedTags.includes(tag) ? Colors.primary : Colors.borderColor,
                  },
                ]}
                onPress={() => handleTagPress(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: selectedTags.includes(tag) ? '#ffffff' : (isDark ? Colors.textPrimaryDark : Colors.textPrimary) },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.notesHeader}>
            <Text style={[styles.label, { color: isDark ? Colors.text : Colors.textDark }]}>
              Notes
            </Text>
            <Text style={[styles.characterCount, { color: Colors.primary }]}>
              {notesText.length} / {MAX_NOTES}
            </Text>
          </View>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
                color: isDark ? Colors.text : Colors.textDark,
                borderColor: Colors.borderColor,
              },
            ]}
            value={notesText}
            onChangeText={setNotesText}
            placeholder="What are you working on?"
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={MAX_NOTES}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: Colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Create Segment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.discardButton,
              { backgroundColor: isDark ? Colors.surfaceDark : Colors.backgroundLight },
            ]}
            onPress={onClosePress}
          >
            <Text style={[styles.discardButtonText, { color: isDark ? Colors.text : Colors.textSecondary }]}>
              Discard
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Order Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.searchModalContent, { backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight }]}>
            {/* Search Header */}
            <View style={styles.searchHeader}>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Text style={[styles.headerButton, { color: Colors.textSecondary }]}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Select Order</Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <TextInput
                autoFocus
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
                    color: isDark ? Colors.text : Colors.textDark,
                    borderColor: Colors.borderColor,
                  },
                ]}
                placeholder="Search by ID, client name, or service..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Search Results */}
            {searchQuery.trim() && filteredOrders.length > 0 ? (
              <FlatList
                data={filteredOrders}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.orderResultItem,
                      { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
                    ]}
                    onPress={() => handleOrderSelect(item)}
                  >
                    <View>
                      <Text style={[styles.resultOrderNumber, { color: isDark ? Colors.text : Colors.textDark }]}>
                        Order #{item.orderNumber}
                      </Text>
                      <Text style={[styles.resultClientName, { color: Colors.textSecondary }]}>
                        {item.clientName}
                      </Text>
                      <Text style={[styles.resultService, { color: Colors.textTertiary }]}>
                        {item.service}
                      </Text>
                    </View>
                    <Badge text={item.status} />
                  </TouchableOpacity>
                )}
                scrollEnabled
                style={styles.searchResultsList}
              />
            ) : searchQuery.trim() ? (
              <View style={styles.noResults}>
                <Text style={[styles.noResultsText, { color: Colors.textSecondary }]}>
                  No orders found
                </Text>
              </View>
            ) : (
              <View style={styles.noResults}>
                <Text style={[styles.noResultsText, { color: Colors.textSecondary }]}>
                  Start typing to search...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  headerTitle: {
    ...Typography.headingSmall,
    fontWeight: '600',
  },
  headerButton: {
    ...Typography.body,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.large,
    paddingBottom: Spacing.large * 3,
  },
  section: {
    marginBottom: Spacing.large * 1.5,
  },
  label: {
    ...Typography.caption,
    fontWeight: '700',
    marginBottom: Spacing.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.medium,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedOrderContent: {
    flex: 1,
    marginRight: Spacing.medium,
  },
  selectedOrderNumber: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: Spacing.small,
  },
  selectedOrderClient: {
    ...Typography.body,
    fontSize: 13,
  },
  placeholderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.medium,
  },
  searchIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.small,
  },
  placeholderText: {
    ...Typography.body,
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timeSection: {
    flexDirection: 'row',
    gap: Spacing.large,
    marginBottom: Spacing.large * 1.5,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.medium,
    paddingVertical: 14,
    textAlign: 'center',
    ...Typography.body,
    fontFamily: 'monospace',
    fontWeight: '600',
    fontSize: 16,
  },
  durationBox: {
    flex: 0.9,
  },
  durationValue: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: Spacing.medium,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationText: {
    ...Typography.heading,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontSize: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  tagButton: {
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 14,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  characterCount: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
    minHeight: 140,
    textAlignVertical: 'top',
    ...Typography.body,
    fontSize: 15,
  },
  actionButtons: {
    gap: Spacing.medium,
    marginTop: Spacing.large * 2,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text,
    fontSize: 16,
  },
  discardButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardButtonText: {
    ...Typography.body,
    fontWeight: '600',
    fontSize: 15,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  searchModalContent: {
    flex: 1,
    marginTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'column',
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  searchInputContainer: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
    ...Typography.body,
  },
  searchResultsList: {
    flex: 1,
  },
  orderResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.medium,
    marginHorizontal: Spacing.medium,
    marginVertical: 4,
    borderRadius: 12,
  },
  resultOrderNumber: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: Spacing.small,
  },
  resultClientName: {
    ...Typography.body,
    fontSize: 13,
    marginBottom: Spacing.small,
  },
  resultService: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: Spacing.small,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.large,
  },
  noResultsText: {
    ...Typography.body,
  },
});
