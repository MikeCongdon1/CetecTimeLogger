import React, { useState, useEffect, useRef } from 'react';
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

const DURATION_CHIPS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: '8h', minutes: 480 },
];

const DAY_START = 6 * 60;  // 6am in minutes
const DAY_END = 20 * 60;   // 8pm in minutes
const DAY_RANGE = DAY_END - DAY_START;

const DAY_LABELS = ['6am', '9am', '12pm', '3pm', '6pm', '8pm'];
const DAY_LABEL_HOURS = [6, 9, 12, 15, 18, 20];

function formatTime12h(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const CommentEditorScreen: React.FC<CommentEditorScreenProps> = ({
  contextData,
  ordlineId = 0,
  assignedUserId = 0,
  onSavePress,
  onClosePress,
}) => {
  const isDark = useColorScheme() === 'dark';

  // Time entry state
  const now = new Date();
  const roundedMinute = Math.floor(now.getMinutes() / 15) * 15;
  const [startHour, setStartHour] = useState(now.getHours());
  const [startMinute, setStartMinute] = useState(roundedMinute);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedChipMinutes, setSelectedChipMinutes] = useState<number | null>(60);
  const [customHoursInput, setCustomHoursInput] = useState('1');
  const [customMinutesInput, setCustomMinutesInput] = useState('00');
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [startHourText, setStartHourText] = useState(
    String(now.getHours() % 12 || 12)
  );
  const [startMinuteText, setStartMinuteText] = useState(
    String(roundedMinute).padStart(2, '0')
  );
  const [isStartAM, setIsStartAM] = useState(now.getHours() < 12);

  // Other form state
  const [commentText, setCommentText] = useState('');
  const [selectedOperationId, setSelectedOperationId] = useState<number | null>(null);
  const [buildOperations, setBuildOperations] = useState<BuildOperation[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  const MAX_CHARACTERS = 500;

  // Derived time values
  const totalStartMinutes = startHour * 60 + startMinute;
  const totalEndMinutes = totalStartMinutes + durationMinutes;
  const endHour = Math.floor(totalEndMinutes / 60) % 24;
  const endMinute = totalEndMinutes % 60;

  // Timeline bar percentages
  const clampedStart = Math.max(DAY_START, Math.min(DAY_END, totalStartMinutes));
  const clampedEnd = Math.max(DAY_START, Math.min(DAY_END, totalEndMinutes));
  const barLeftPct = ((clampedStart - DAY_START) / DAY_RANGE) * 100;
  const barWidthPct = Math.max(2, ((clampedEnd - clampedStart) / DAY_RANGE) * 100);

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
        if (!refreshToken) return;
        authToken = refreshToken;
      }

      const cetecUrl = await dbService.getSetting('cetecUrl');
      if (!cetecUrl) return;

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

      if (!response.ok) throw new Error(`Failed to fetch build operations: ${response.status}`);

      const data = await response.json();

      const sortedOperations = (data.data || []).sort((a: BuildOperation, b: BuildOperation) => {
        if (a.ordline_map_operation_id !== 0 && b.ordline_map_operation_id === 0) return -1;
        if (a.ordline_map_operation_id === 0 && b.ordline_map_operation_id !== 0) return 1;
        return a.name.localeCompare(b.name);
      });

      setBuildOperations(sortedOperations);
      if (sortedOperations.length > 0) {
        setSelectedOperationId(sortedOperations[0].id);
      }
    } catch (error) {
      console.error('Error fetching build operations:', error);
    } finally {
      setIsLoadingOperations(false);
    }
  };

  const handleChipPress = (minutes: number) => {
    setDurationMinutes(minutes);
    setSelectedChipMinutes(minutes);
    setCustomHoursInput(String(Math.floor(minutes / 60)));
    setCustomMinutesInput(String(minutes % 60).padStart(2, '0'));
  };

  const handleCustomHoursChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setCustomHoursInput(cleaned);
    const h = parseInt(cleaned, 10) || 0;
    const m = parseInt(customMinutesInput, 10) || 0;
    const total = h * 60 + m;
    if (total > 0) {
      setDurationMinutes(total);
      setSelectedChipMinutes(null);
    }
  };

  const handleCustomMinutesChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setCustomMinutesInput(cleaned);
    const h = parseInt(customHoursInput, 10) || 0;
    const m = parseInt(cleaned, 10) || 0;
    const total = h * 60 + m;
    if (total > 0) {
      setDurationMinutes(total);
      setSelectedChipMinutes(null);
    }
  };

  const commitStartTime = () => {
    let h = parseInt(startHourText, 10) || 12;
    const m = Math.min(59, parseInt(startMinuteText, 10) || 0);
    // Convert 12-hour to 24-hour
    if (!isStartAM && h !== 12) h += 12;
    if (isStartAM && h === 12) h = 0;
    h = Math.min(23, Math.max(0, h));
    setStartHour(h);
    setStartMinute(m);
    setEditingStartTime(false);
  };

  const handleSave = async () => {
    try {
      if (!selectedOperationId) {
        Alert.alert('Error', 'Please select an operation');
        return;
      }

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

      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

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
            hours,
            minutes,
            pieces: 1,
            comment: commentText,
            serial_ranges: [],
            is_label_serial: false,
          },
        ],
      };

      const response = await fetch(`${cetecUrl}/goapis/api/v1/production/order/work_view/start_work`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(startWorkPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        Alert.alert('Error', `Failed to log time: ${response.status}`);
        return;
      }

      onSavePress?.(commentText, []);
      onClosePress?.();
    } catch (error) {
      Alert.alert('Error', `Failed to log time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const bg = isDark ? Colors.backgroundDark : Colors.backgroundLight;
  const surface = isDark ? Colors.surfaceDark : Colors.surfaceLight;
  const textPrimary = isDark ? Colors.textPrimaryDark : Colors.textPrimary;
  const textMuted = isDark ? Colors.textMutedDark : Colors.textMuted;
  const border = isDark ? Colors.borderDark : Colors.borderLight;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: border }]}>
        <IconButton icon={Icons.close} onPress={onClosePress || (() => {})} size="medium" variant="ghost" />
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Log Time</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Order Context */}
        <View style={[styles.contextCard, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.contextLabel, { color: textMuted }]}>
            Order #{contextData.orderNumber}
          </Text>
          <Text style={[styles.contextTitle, { color: textPrimary }]}>
            {contextData.title}
          </Text>
        </View>

        {/* ── TIME ENTRY ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>DURATION</Text>

          {/* Duration chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {DURATION_CHIPS.map(chip => {
              const active = selectedChipMinutes === chip.minutes;
              return (
                <TouchableOpacity
                  key={chip.minutes}
                  style={[
                    styles.chip,
                    { borderColor: active ? Colors.primary : border },
                    active && { backgroundColor: Colors.primary },
                  ]}
                  onPress={() => handleChipPress(chip.minutes)}
                >
                  <Text style={[styles.chipText, { color: active ? 'white' : textPrimary }]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Custom H:M entry */}
          <View style={styles.customRow}>
            <TextInput
              style={[styles.customInput, { color: textPrimary, backgroundColor: surface, borderColor: border }]}
              keyboardType="numeric"
              maxLength={2}
              value={customHoursInput}
              onChangeText={handleCustomHoursChange}
              selectTextOnFocus
            />
            <Text style={[styles.customSep, { color: textMuted }]}>h</Text>
            <TextInput
              style={[styles.customInput, { color: textPrimary, backgroundColor: surface, borderColor: border }]}
              keyboardType="numeric"
              maxLength={2}
              value={customMinutesInput}
              onChangeText={handleCustomMinutesChange}
              selectTextOnFocus
            />
            <Text style={[styles.customSep, { color: textMuted }]}>m</Text>
            <Text style={[styles.totalDuration, { color: Colors.primary }]}>
              = {formatDuration(durationMinutes)}
            </Text>
          </View>
        </View>

        {/* ── CALENDAR-STYLE TIMELINE ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>TODAY'S TIMELINE</Text>

          {/* Start/End time row */}
          <View style={styles.timeRangeRow}>
            <TouchableOpacity
              style={[styles.timePill, { backgroundColor: surface, borderColor: Colors.primary, borderWidth: 1.5 }]}
              onPress={() => setEditingStartTime(!editingStartTime)}
            >
              <Text style={[styles.timePillLabel, { color: textMuted }]}>FROM</Text>
              <Text style={[styles.timePillValue, { color: Colors.primary }]}>
                {formatTime12h(startHour, startMinute)}
              </Text>
            </TouchableOpacity>

            <View style={styles.timeArrow}>
              <Text style={[styles.timeArrowIcon, { color: textMuted }]}>→</Text>
              <Text style={[styles.durationBadge, { color: Colors.primary, backgroundColor: isDark ? Colors.surfaceDark : '#e8f4fd' }]}>
                {formatDuration(durationMinutes)}
              </Text>
            </View>

            <View style={[styles.timePill, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <Text style={[styles.timePillLabel, { color: textMuted }]}>TO</Text>
              <Text style={[styles.timePillValue, { color: textPrimary }]}>
                {formatTime12h(endHour, endMinute)}
              </Text>
            </View>
          </View>

          {/* Inline start time editor */}
          {editingStartTime && (
            <View style={[styles.startTimeEditor, { backgroundColor: surface, borderColor: border }]}>
              <Text style={[styles.startTimeEditorLabel, { color: textMuted }]}>Set start time</Text>
              <View style={styles.startTimeInputRow}>
                <TextInput
                  style={[styles.startTimeInput, { color: textPrimary, borderColor: border, backgroundColor: bg }]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={startHourText}
                  onChangeText={setStartHourText}
                  selectTextOnFocus
                />
                <Text style={[styles.startTimeSep, { color: textMuted }]}>:</Text>
                <TextInput
                  style={[styles.startTimeInput, { color: textPrimary, borderColor: border, backgroundColor: bg }]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={startMinuteText}
                  onChangeText={setStartMinuteText}
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={[styles.ampmButton, { backgroundColor: isStartAM ? Colors.primary : 'transparent', borderColor: border }]}
                  onPress={() => setIsStartAM(true)}
                >
                  <Text style={[styles.ampmText, { color: isStartAM ? 'white' : textMuted }]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmButton, { backgroundColor: !isStartAM ? Colors.primary : 'transparent', borderColor: border }]}
                  onPress={() => setIsStartAM(false)}
                >
                  <Text style={[styles.ampmText, { color: !isStartAM ? 'white' : textMuted }]}>PM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.doneButton, { backgroundColor: Colors.primary }]}
                  onPress={commitStartTime}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Visual day bar */}
          <View style={styles.dayBarContainer}>
            <View style={styles.dayBarTrack}>
              <View
                style={[
                  styles.dayBarBlock,
                  {
                    left: `${barLeftPct}%` as any,
                    width: `${barWidthPct}%` as any,
                    backgroundColor: Colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.dayBarLabels}>
              {DAY_LABELS.map((label, i) => (
                <Text key={i} style={[styles.dayBarLabel, { color: textMuted }]}>{label}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* ── OPERATION ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>OPERATION</Text>
          {isLoadingOperations ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : buildOperations.length === 1 ? (
            // Single operation - show as label, no selection needed
            <View style={[styles.singleOperationBadge, { backgroundColor: isDark ? Colors.surfaceDark : '#e8f4fd', borderColor: Colors.primary }]}>
              <Text style={[styles.singleOperationText, { color: Colors.primary }]}>
                {buildOperations[0].name}
              </Text>
            </View>
          ) : buildOperations.length > 0 ? (
            buildOperations.length <= 4 ? (
              // Few operations - show as horizontal chips
              <View style={styles.operationChipsRow}>
                {buildOperations.map(op => {
                  const active = selectedOperationId === op.id;
                  return (
                    <TouchableOpacity
                      key={op.id}
                      style={[
                        styles.operationChip,
                        { borderColor: active ? Colors.primary : border },
                        active && { backgroundColor: Colors.primary },
                      ]}
                      onPress={() => setSelectedOperationId(op.id)}
                    >
                      <Text style={[styles.operationChipText, { color: active ? 'white' : textPrimary }]}>
                        {op.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              // Many operations - scrollable list
              <View style={[styles.operationList, { borderColor: border }]}>
                {buildOperations.map(op => {
                  const active = selectedOperationId === op.id;
                  return (
                    <TouchableOpacity
                      key={op.id}
                      style={[
                        styles.operationListItem,
                        { borderBottomColor: border },
                        active && { backgroundColor: isDark ? Colors.surfaceDarkAlt : '#e8f4fd' },
                      ]}
                      onPress={() => setSelectedOperationId(op.id)}
                    >
                      <View style={[styles.operationRadio, { borderColor: active ? Colors.primary : border }]}>
                        {active && <View style={[styles.operationRadioFill, { backgroundColor: Colors.primary }]} />}
                      </View>
                      <Text style={[styles.operationListItemText, { color: active ? Colors.primary : textPrimary, fontWeight: active ? '600' : '400' }]}>
                        {op.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          ) : (
            <Text style={[styles.noOperationsText, { color: textMuted }]}>No operations available</Text>
          )}
        </View>

        {/* ── NOTES ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>NOTES <Text style={[styles.optionalLabel, { color: textMuted }]}>(optional)</Text></Text>
          <TextInput
            style={[styles.commentInput, { color: textPrimary, borderColor: border }]}
            placeholder="What did you work on?"
            placeholderTextColor={textMuted}
            multiline
            maxLength={MAX_CHARACTERS}
            value={commentText}
            onChangeText={setCommentText}
          />
          <Text style={[styles.charCount, { color: textMuted }]}>{commentText.length}/{MAX_CHARACTERS}</Text>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: Colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.logButtonText}>Log Time — {formatDuration(durationMinutes)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  content: { flex: 1 },
  contextCard: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  contextLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextTitle: {
    ...Typography.titleMedium,
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  optionalLabel: {
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
  // Duration chips
  chipsRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  chipText: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
  // Custom H:M input
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  customInput: {
    width: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    textAlign: 'center',
    ...Typography.titleMedium,
    fontWeight: '600',
  },
  customSep: {
    ...Typography.titleMedium,
    fontWeight: '600',
  },
  totalDuration: {
    ...Typography.titleSmall,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  // Time range row
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timePill: {
    flex: 1,
    borderRadius: 10,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  timePillLabel: {
    ...Typography.labelSmall,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timePillValue: {
    ...Typography.titleSmall,
    fontWeight: '600',
  },
  timeArrow: {
    alignItems: 'center',
    gap: 2,
  },
  timeArrowIcon: {
    fontSize: 16,
  },
  durationBadge: {
    ...Typography.labelSmall,
    fontWeight: '700',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Inline start time editor
  startTimeEditor: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  startTimeEditorLabel: {
    ...Typography.labelSmall,
  },
  startTimeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  startTimeInput: {
    width: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Spacing.xs,
    textAlign: 'center',
    ...Typography.titleMedium,
    fontWeight: '600',
  },
  startTimeSep: {
    ...Typography.titleMedium,
    fontWeight: '600',
  },
  ampmButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  ampmText: {
    ...Typography.labelSmall,
    fontWeight: '600',
  },
  doneButton: {
    marginLeft: 'auto' as any,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  doneButtonText: {
    ...Typography.labelSmall,
    fontWeight: '600',
    color: 'white',
  },
  // Day bar
  dayBarContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  dayBarTrack: {
    height: 20,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  dayBarBlock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 4,
    opacity: 0.85,
  },
  dayBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayBarLabel: {
    ...Typography.labelSmall,
    fontSize: 10,
  },
  // Operations
  singleOperationBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  singleOperationText: {
    ...Typography.titleSmall,
    fontWeight: '600',
  },
  operationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  operationChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  operationChipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  operationList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  operationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  operationRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationRadioFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  operationListItemText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  noOperationsText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  // Comment
  commentInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.bodyMedium,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  charCount: {
    ...Typography.labelSmall,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  // Footer
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  logButton: {
    paddingVertical: Spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  logButtonText: {
    color: 'white',
    ...Typography.titleSmall,
    fontWeight: '700',
  },
});
