import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  IconButton,
  Badge,
} from '../../components';
import { CommentContextData } from '../../types';
import { Colors, Spacing, Typography, Icons } from '../../theme';
import * as tokenStorage from '../../utils/tokenStorage';
import dbService from '../../utils/database';

interface BuildOperation {
  ordline_map_operation_id: number;
  id: number;
  name: string;
}

interface CommentEditorScreenProps {
  contextData: CommentContextData;
  ordlineId?: number;
  assignedUserId?: number;
  onSavePress?: (comment: string, tags: string[]) => void;
  onClosePress?: () => void;
}

export const CommentEditorScreen: React.FC<CommentEditorScreenProps> = ({
  contextData,
  ordlineId = 0,
  assignedUserId = 0,
  onSavePress,
  onClosePress,
}) => {
  const isDark = useColorScheme() === 'dark';
  const [commentText, setCommentText] = useState('');
  const [selectedOperationId, setSelectedOperationId] = useState<number | null>(null);
  const [timeMode, setTimeMode] = useState<'elapsed' | 'startTime'>('elapsed');
  const [startTime, setStartTime] = useState('');
  const [elapsedHours, setElapsedHours] = useState(contextData.elapsedTime.hours.toString());
  const [elapsedMinutes, setElapsedMinutes] = useState(contextData.elapsedTime.minutes.toString());
  const [elapsedSeconds, setElapsedSeconds] = useState(contextData.elapsedTime.seconds?.toString() || '0');
  const [buildOperations, setBuildOperations] = useState<BuildOperation[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  const MAX_CHARACTERS = 500;
  const characterCount = commentText.length;

  // Fetch build operations on component mount
  useEffect(() => {
    fetchBuildOperations();
  }, []);

  const fetchBuildOperations = async () => {
    try {
      setIsLoadingOperations(true);

      let authToken = '';
      const tokens = await tokenStorage.getTokens();
      if (tokens?.accessToken) {
        authToken = tokens.accessToken;
      } else {
        const refreshToken = await dbService.getSetting('refreshToken');
        if (!refreshToken) {
          console.error('Not authenticated');
          return;
        }
        authToken = refreshToken;
      }

      const cetecUrl = await dbService.getSetting('cetecUrl');
      if (!cetecUrl) {
        console.error('CetecERP URL not configured');
        return;
      }

      const response = await fetch(`${cetecUrl}/goapis/api/v1/production/order/work_view/build_operation_dropdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ordline_ids: [ordlineId],
          location_id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch build operations: ${response.status}`);
      }

      const data = await response.json();
      console.log('Build operations:', data);

      // Sort operations: items with ordline_map_operation_id != 0 first, then alphabetically
      const sortedOperations = (data.data || []).sort((a: BuildOperation, b: BuildOperation) => {
        if (a.ordline_map_operation_id !== 0 && b.ordline_map_operation_id === 0) return -1;
        if (a.ordline_map_operation_id === 0 && b.ordline_map_operation_id !== 0) return 1;
        return a.name.localeCompare(b.name);
      });

      setBuildOperations(sortedOperations);
      
      // Auto-select first operation
      if (sortedOperations.length > 0) {
        setSelectedOperationId(sortedOperations[0].id);
      }
    } catch (error) {
      console.error('Error fetching build operations:', error);
    } finally {
      setIsLoadingOperations(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedOperationId) {
        Alert.alert('Error', 'Please select an operation');
        return;
      }

      // Get auth token
      let authToken = '';
      const tokens = await tokenStorage.getTokens();
      if (tokens?.accessToken) {
        authToken = tokens.accessToken;
      } else {
        const refreshToken = await dbService.getSetting('refreshToken');
        if (!refreshToken) {
          Alert.alert('Error', 'Not authenticated. Please reconnect in Settings.');
          return;
        }
        authToken = refreshToken;
      }

      const cetecUrl = await dbService.getSetting('cetecUrl');
      if (!cetecUrl) {
        Alert.alert('Error', 'CetecERP URL not configured.');
        return;
      }

      const hours = parseInt(elapsedHours, 10) || 0;
      const minutes = parseInt(elapsedMinutes, 10) || 0;

      const startWorkPayload = {
        work_location_id: 1,
        ordline_map_operation_id: 0,
        build_operation_id: selectedOperationId,
        setup: false,
        assigned_user_id: assignedUserId,
        number_of_worker: 1,
        overhead_only: false,
        overtime: false,
        ordline_ids: [ordlineId],
        comment: commentText,
        failed_inspection_id: 0,
        serial_ranges: [],
        add_and_close_at_once_info: [
          {
            hours: hours,
            minutes: minutes,
            pieces: 1,
            comment: commentText,
            serial_ranges: [],
            is_label_serial: false,
          },
        ],
      };

      console.log('Starting work with payload:', startWorkPayload);

      const response = await fetch(`${cetecUrl}/goapis/api/v1/production/order/work_view/start_work`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(startWorkPayload),
      });

      console.log('Start work response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Start work failed:', response.status, errorText);
        Alert.alert('Error', `Failed to start work: ${response.status}`);
        return;
      }

      const responseData = await response.json();
      console.log('Start work response:', responseData);
      
      Alert.alert('Success', 'Work started successfully');
      onClosePress?.();
    } catch (error) {
      console.error('Error starting work:', error);
      Alert.alert('Error', `Failed to start work: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
            borderBottomColor: isDark ? Colors.borderDark : Colors.borderLight,
          },
        ]}
      >
        <IconButton
          icon={Icons.close}
          onPress={onClosePress || (() => {})}
          size="medium"
          variant="ghost"
        />
        <Text
          style={[
            styles.headerTitle,
            {
              color: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
            },
          ]}
        >
          Edit Comment
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Context Card */}
        <View style={styles.contextSection}>
          <View
            style={[
              styles.contextCard,
              {
                backgroundColor: isDark
                  ? Colors.surfaceDark
                  : Colors.surfaceLight,
                borderColor: isDark ? Colors.borderDark : Colors.borderLight,
              },
            ]}
          >
            <View style={styles.contextHeader}>
              <View style={styles.contextInfo}>
                <Text
                  style={[
                    styles.contextLabel,
                    {
                      color: isDark
                        ? Colors.textMutedDark
                        : Colors.textMuted,
                    },
                  ]}
                >
                  Order #{contextData.orderNumber}
                </Text>
                <Text
                  style={[
                    styles.contextTitle,
                    {
                      color: isDark
                        ? Colors.textPrimaryDark
                        : Colors.textPrimary,
                    },
                  ]}
                >
                  {contextData.title}
                </Text>
              </View>
              <Text
                style={[
                  styles.elapsedTimeSmall,
                  {
                    color: isDark
                      ? Colors.textMutedDark
                      : Colors.textMuted,
                  },
                ]}
              >
                {contextData.elapsedTime.hours}h {contextData.elapsedTime.minutes}m
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: '75%' },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Time Input Section */}
        <View style={styles.timeSection}>
          <View style={styles.timeModeToggle}>
            <TouchableOpacity
              style={[
                styles.timeModeButton,
                {
                  backgroundColor: timeMode === 'elapsed' ? Colors.primary : 'transparent',
                  borderBottomWidth: timeMode === 'elapsed' ? 2 : 0,
                  borderBottomColor: Colors.primary,
                },
              ]}
              onPress={() => setTimeMode('elapsed')}
            >
              <Text
                style={[
                  styles.timeModeButtonText,
                  {
                    color: timeMode === 'elapsed' ? 'white' : (isDark ? Colors.textMutedDark : Colors.textMuted),
                  },
                ]}
              >
                Elapsed Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeModeButton,
                {
                  backgroundColor: timeMode === 'startTime' ? Colors.primary : 'transparent',
                  borderBottomWidth: timeMode === 'startTime' ? 2 : 0,
                  borderBottomColor: Colors.primary,
                },
              ]}
              onPress={() => setTimeMode('startTime')}
            >
              <Text
                style={[
                  styles.timeModeButtonText,
                  {
                    color: timeMode === 'startTime' ? 'white' : (isDark ? Colors.textMutedDark : Colors.textMuted),
                  },
                ]}
              >
                Start Time
              </Text>
            </TouchableOpacity>
          </View>

          {timeMode === 'elapsed' ? (
            <View style={styles.elapsedTimeInputs}>
              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: isDark ? Colors.textMutedDark : Colors.textMuted }]}>Hours</Text>
                <TextInput
                  style={[styles.timeInput, { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary, backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight, borderColor: isDark ? Colors.borderDark : Colors.borderLight }]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={elapsedHours}
                  onChangeText={(text) => setElapsedHours(text.replace(/[^0-9]/g, ''))}
                />
              </View>
              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: isDark ? Colors.textMutedDark : Colors.textMuted }]}>Minutes</Text>
                <TextInput
                  style={[styles.timeInput, { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary, backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight, borderColor: isDark ? Colors.borderDark : Colors.borderLight }]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={elapsedMinutes}
                  onChangeText={(text) => setElapsedMinutes(text.replace(/[^0-9]/g, ''))}
                />
              </View>
              <View style={styles.timeInputGroup}>
                <Text style={[styles.timeInputLabel, { color: isDark ? Colors.textMutedDark : Colors.textMuted }]}>Seconds</Text>
                <TextInput
                  style={[styles.timeInput, { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary, backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight, borderColor: isDark ? Colors.borderDark : Colors.borderLight }]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={elapsedSeconds}
                  onChangeText={(text) => setElapsedSeconds(text.replace(/[^0-9]/g, ''))}
                />
              </View>
            </View>
          ) : (
            <View style={styles.startTimeInputContainer}>
              <TextInput
                style={[styles.startTimeInput, { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary, backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight, borderColor: isDark ? Colors.borderDark : Colors.borderLight }]}
                placeholder="HH:MM AM/PM"
                placeholderTextColor={isDark ? Colors.textMutedDark : Colors.textMuted}
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
          )}
        </View>

        {/* Build Operation Dropdown */}
        <View style={styles.operationSection}>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: isDark ? Colors.textMutedDark : Colors.textMuted,
              },
            ]}
          >
            Operation
          </Text>
          {isLoadingOperations ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : buildOperations.length > 0 ? (
            <View
              style={[
                styles.dropdownContainer,
                {
                  backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
                  borderColor: isDark ? Colors.borderDark : Colors.borderLight,
                },
              ]}
            >
              <FlatList
                data={buildOperations}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedOperationId === item.id && {
                        backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight,
                      },
                    ]}
                    onPress={() => setSelectedOperationId(item.id)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        {
                          color: selectedOperationId === item.id ? Colors.primary : (isDark ? Colors.textPrimaryDark : Colors.textPrimary),
                          fontWeight: selectedOperationId === item.id ? '600' : '400',
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : (
            <Text
              style={[
                styles.noOperationsText,
                {
                  color: isDark ? Colors.textMutedDark : Colors.textMuted,
                },
              ]}
            >
              No operations available
            </Text>
          )}
        </View>

        {/* Comment Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={[
              styles.commentInput,
              {
                backgroundColor: 'transparent',
                color: isDark ? Colors.textPrimaryDark : Colors.textPrimary,
              },
            ]}
            placeholder="Describe your work here... what did you accomplish?"
            placeholderTextColor={isDark ? Colors.textMutedDark : Colors.textMuted}
            multiline
            maxLength={MAX_CHARACTERS}
            value={commentText}
            onChangeText={setCommentText}
          />
        </View>
      </ScrollView>

      {/* Footer Toolbar */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: isDark
              ? Colors.surfaceDark
              : Colors.surfaceLight,
            borderTopColor: isDark ? Colors.borderDark : Colors.borderLight,
          },
        ]}
      >
        <Text
          style={[
            styles.characterCount,
            {
              color: isDark
                ? Colors.textMutedDark
                : Colors.textMuted,
            },
          ]}
        >
          {characterCount}/{MAX_CHARACTERS}
        </Text>
        <TouchableOpacity
          style={[
            styles.saveBarButton,
            { backgroundColor: Colors.primary },
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveBarButtonText}>Save Comment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...Typography.titleMedium,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    color: Colors.primary,
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contextSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  contextCard: {
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.md,
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  contextInfo: {
    flex: 1,
  },
  elapsedTimeSmall: {
    ...Typography.labelSmall,
    fontSize: 11,
    fontWeight: '500',
  },
  contextLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  contextTitle: {
    ...Typography.titleMedium,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  timeSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  timeModeToggle: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeModeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeModeButtonText: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
  elapsedTimeInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeInputGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
  timeInputLabel: {
    ...Typography.labelSmall,
    fontWeight: '500',
  },
  timeInput: {
    ...Typography.bodySmall,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    textAlign: 'center',
    fontWeight: '500',
  },
  startTimeInputContainer: {
    gap: Spacing.xs,
  },
  startTimeInput: {
    ...Typography.bodyLarge,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tagsSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tagsList: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tagsContent: {
    gap: Spacing.sm,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagIcon: {
    fontSize: 14,
  },
  tagText: {
    ...Typography.bodySmall,
  },
  operationSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    maxHeight: 240,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemText: {
    ...Typography.bodyMedium,
  },
  noOperationsText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  inputSection: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  commentInput: {
    ...Typography.bodyLarge,
    textAlignVertical: 'top',
    minHeight: 200,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'column',
    gap: Spacing.md,
  },
  characterCount: {
    ...Typography.labelSmall,
    fontVariant: ['tabular-nums'],
  },
  saveBarButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  saveBarButtonText: {
    color: 'white',
    ...Typography.labelLarge,
    fontWeight: '600',
  },
});
