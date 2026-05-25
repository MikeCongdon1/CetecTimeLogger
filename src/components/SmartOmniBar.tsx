import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  Animated, ScrollView,
} from 'react-native';
import { Order } from '../types';
import { Colors, Spacing, Typography } from '../theme';
import { parseCommand, fuzzyMatchOrders } from '../utils/omnibarParser';

const WORK_TYPE_SUGGESTIONS = ['Development', 'Meeting', 'Design', 'Testing', 'Support'];

export interface SmartOmniBarProps {
  orders: Order[];
  recentlyLogged: Order[];
  onOrderSelect: (order: Order, workType?: string, durationHours?: number) => void;
  isDark: boolean;
}

// ── Waveform ──────────────────────────────────────────────────────────────────

const WaveformBars: React.FC<{ isActive: boolean; color: string }> = ({ isActive, color }) => {
  const anims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.25))).current;
  const isActiveRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = isActive;

    if (!isActive) {
      anims.forEach(a =>
        Animated.timing(a, { toValue: 0.25, duration: 200, useNativeDriver: false }).start()
      );
      return;
    }

    const animateBar = (anim: Animated.Value, delay: number) => {
      const run = () => {
        if (!isActiveRef.current) return;
        const toValue = 0.15 + Math.random() * 0.85;
        const duration = 100 + Math.random() * 180;
        Animated.timing(anim, { toValue, duration, useNativeDriver: false }).start(
          ({ finished }) => { if (finished) run(); }
        );
      };
      setTimeout(run, delay);
    };

    anims.forEach((a, i) => animateBar(a, i * 55));
  }, [isActive]);

  return (
    <View style={waveStyles.row}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[waveStyles.bar, {
            backgroundColor: color,
            height: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 18] }),
          }]}
        />
      ))}
    </View>
  );
};

const waveStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 22, marginHorizontal: 2 },
  bar: { width: 3, borderRadius: 2 },
});

// ── SmartOmniBar ──────────────────────────────────────────────────────────────

export const SmartOmniBar: React.FC<SmartOmniBarProps> = ({
  orders, recentlyLogged, onOrderSelect, isDark,
}) => {
  const [text, setText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(60);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(320);

  const barRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const recognizerRef = useRef<any>(null);
  const isVoiceRef = useRef(false);
  const matchedRef = useRef<Order[]>([]);
  const parsedRef = useRef(parseCommand(''));

  const isVoiceSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Deduplicated combined order list (recent first for priority)
  const allOrders = useMemo(() => {
    const seen = new Set<string>();
    const result: Order[] = [];
    for (const o of [...recentlyLogged, ...orders]) {
      if (!seen.has(o.id)) { seen.add(o.id); result.push(o); }
    }
    return result;
  }, [orders, recentlyLogged]);

  const recentIds = useMemo(() => new Set(recentlyLogged.map(o => o.id)), [recentlyLogged]);

  const parsed = useMemo(() => parseCommand(text), [text]);

  const matchedOrders = useMemo(() => {
    if (!parsed.orderSearchTerm) return recentlyLogged.slice(0, 4);
    return fuzzyMatchOrders(allOrders, parsed.orderSearchTerm).slice(0, 5);
  }, [allOrders, recentlyLogged, parsed.orderSearchTerm]);

  // Keep refs in sync for voice handler closures
  useEffect(() => { matchedRef.current = matchedOrders; }, [matchedOrders]);
  useEffect(() => { parsedRef.current = parsed; }, [parsed]);

  // ── Dropdown positioning ───────────────────────────────────────────────────

  const measureAndShow = useCallback(() => {
    barRef.current?.measureInWindow((x, y, w, h) => {
      setDropdownTop(y + h + 4);
      setDropdownLeft(x);
      if (w > 0) setDropdownWidth(w);
      setIsDropdownVisible(true);
    });
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownVisible(false);
  }, []);

  // ── Input handlers ─────────────────────────────────────────────────────────

  const handleTextChange = (t: string) => {
    setText(t);
    if (t.trim().length > 0) {
      if (!isDropdownVisible) measureAndShow();
    } else {
      closeDropdown();
    }
  };

  const handleFocus = () => { measureAndShow(); };

  const handleBlur = () => {
    // Small delay so tapping a dropdown item fires before blur closes it
    setTimeout(() => {
      if (!isVoiceRef.current) setIsDropdownVisible(false);
    }, 200);
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  const selectOrder = useCallback((order: Order, workType?: string, durationHours?: number) => {
    setIsDropdownVisible(false);
    setIsVoiceActive(false);
    isVoiceRef.current = false;
    setText('');
    recognizerRef.current?.stop();
    onOrderSelect(order, workType, durationHours);
  }, [onOrderSelect]);

  const handleOrderTap = (order: Order) => {
    selectOrder(order, parsed.workType, parsed.durationHours);
  };

  const handleWorkTypeTap = (wt: string) => {
    const p = parsedRef.current;
    const matches = matchedRef.current;
    if (matches.length > 0) {
      selectOrder(matches[0], wt, p.durationHours);
    } else {
      setText(prev => `${prev} ${wt.toLowerCase()}`.trim());
      inputRef.current?.focus();
    }
  };

  // ── Voice ──────────────────────────────────────────────────────────────────

  const startVoice = () => {
    if (!isVoiceSupported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const t = transcript.trim();
      setText(t);

      const lower = t.toLowerCase();
      const matches = matchedRef.current;
      const p = parseCommand(t);

      // Ordinal voice disambiguation
      if (/\b(first|one|number one|first one)\b/.test(lower) && matches[0]) {
        selectOrder(matches[0], p.workType, p.durationHours);
        recognition.stop();
        return;
      }
      if (/\b(second|two|number two|second one)\b/.test(lower) && matches[1]) {
        selectOrder(matches[1], p.workType, p.durationHours);
        recognition.stop();
        return;
      }
      if (/\b(third|three|number three|third one)\b/.test(lower) && matches[2]) {
        selectOrder(matches[2], p.workType, p.durationHours);
        recognition.stop();
        return;
      }

      if (!isDropdownVisible) measureAndShow();
    };

    recognition.onerror = () => { isVoiceRef.current = false; setIsVoiceActive(false); };
    recognition.onend = () => { isVoiceRef.current = false; setIsVoiceActive(false); };

    recognition.start();
    recognizerRef.current = recognition;
    isVoiceRef.current = true;
    setIsVoiceActive(true);
    measureAndShow();
  };

  const stopVoice = () => {
    recognizerRef.current?.stop();
    isVoiceRef.current = false;
    setIsVoiceActive(false);
  };

  useEffect(() => () => { recognizerRef.current?.stop(); }, []);

  // ── Colors ─────────────────────────────────────────────────────────────────

  const surface = isDark ? Colors.surfaceDark : Colors.surfaceLight;
  const border = isDark ? Colors.borderDark : Colors.borderLight;
  const textPrimary = isDark ? Colors.textPrimaryDark : Colors.textPrimary;
  const textMuted = isDark ? Colors.textMutedDark : Colors.textMuted;
  const bgDrop = isDark ? Colors.surfaceDarkAlt : Colors.surfaceLight;

  const showRecentSection = !parsed.orderSearchTerm && recentlyLogged.length > 0;
  const showWorkTypePills = matchedOrders.length > 0 && !parsed.workType && !!parsed.orderSearchTerm;
  const showVoiceHint = isVoiceActive && matchedOrders.length > 1;

  const formattedDuration = parsed.durationHours != null
    ? parsed.durationHours >= 1
      ? `${parsed.durationHours}h`
      : `${Math.round(parsed.durationHours * 60)}m`
    : null;

  return (
    <>
      {/* ── Input Bar ──────────────────────────────────────────────────────── */}
      <View
        ref={barRef}
        collapsable={false}
        style={[
          styles.bar,
          {
            backgroundColor: surface,
            borderColor: isVoiceActive ? Colors.primary : border,
            borderWidth: isVoiceActive ? 1.5 : 1,
          },
        ]}
      >
        <Text style={styles.searchEmoji}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: textPrimary }]}
          value={text}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder='Log time… "1.5h Acme Design"'
          placeholderTextColor={textMuted}
          returnKeyType="search"
        />
        {isVoiceActive && <WaveformBars isActive color={Colors.primary} />}
        {text.length > 0 && !isVoiceActive && (
          <TouchableOpacity
            onPress={() => { setText(''); closeDropdown(); }}
            style={styles.iconBtn}
          >
            <Text style={[styles.iconText, { color: textMuted }]}>✕</Text>
          </TouchableOpacity>
        )}
        {isVoiceSupported && (
          <TouchableOpacity
            onPress={isVoiceActive ? stopVoice : startVoice}
            style={styles.iconBtn}
          >
            <Text style={[styles.iconText, { color: isVoiceActive ? Colors.primary : textMuted }]}>
              {isVoiceActive ? '⏹' : '🎙'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Dropdown Overlay ───────────────────────────────────────────────── */}
      <Modal
        transparent
        visible={isDropdownVisible}
        animationType="none"
        onRequestClose={closeDropdown}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={closeDropdown}
          activeOpacity={1}
        >
          {/* Dropdown card — inner TouchableOpacity swallows taps so backdrop doesn't fire */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[
              styles.dropdown,
              {
                top: dropdownTop,
                left: dropdownLeft,
                width: dropdownWidth,
                backgroundColor: bgDrop,
                borderColor: border,
              },
            ]}
          >
            {/* Header row */}
            <View style={[styles.dropHeader, { borderBottomColor: border }]}>
              <Text style={[styles.dropHeaderLabel, { color: textMuted }]}>
                {showRecentSection ? 'RECENTLY LOGGED' : 'SEARCH RESULTS'}
              </Text>
              {formattedDuration && (
                <View style={[
                  styles.durationChip,
                  { backgroundColor: `${Colors.primary}22`, borderColor: `${Colors.primary}55` },
                ]}>
                  <Text style={[styles.durationChipText, { color: Colors.primary }]}>
                    {formattedDuration}
                  </Text>
                </View>
              )}
              {parsed.workType && (
                <View style={[
                  styles.durationChip,
                  { backgroundColor: `${Colors.statusSuccess}22`, borderColor: `${Colors.statusSuccess}55` },
                ]}>
                  <Text style={[styles.durationChipText, { color: Colors.statusSuccess }]}>
                    {parsed.workType}
                  </Text>
                </View>
              )}
            </View>

            {/* Order results */}
            <ScrollView
              style={styles.resultsList}
              keyboardShouldPersistTaps="always"
              bounces={false}
            >
              {matchedOrders.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={[styles.emptyText, { color: textMuted }]}>
                    {parsed.orderSearchTerm
                      ? `No orders matching "${parsed.orderSearchTerm}"`
                      : 'Type an order name or client…'}
                  </Text>
                </View>
              ) : (
                matchedOrders.map((order, idx) => {
                  const isRecent = recentIds.has(order.id);
                  const isBest = idx === 0 && !!parsed.orderSearchTerm;
                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={[
                        styles.resultRow,
                        { borderBottomColor: border },
                        isBest && { backgroundColor: `${Colors.primary}0d` },
                      ]}
                      onPress={() => handleOrderTap(order)}
                    >
                      <Text style={styles.folderIcon}>📁</Text>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultNum, { color: textMuted }]} numberOfLines={1}>
                          {order.orderNumber}
                        </Text>
                        <Text style={[styles.resultClient, { color: textPrimary }]} numberOfLines={1}>
                          {order.clientName}
                        </Text>
                      </View>
                      <View style={styles.resultMeta}>
                        {isRecent && (
                          <View style={[styles.recentBadge, { backgroundColor: `${Colors.statusSuccess}25` }]}>
                            <Text style={[styles.recentBadgeText, { color: Colors.statusSuccess }]}>
                              Recent
                            </Text>
                          </View>
                        )}
                        {isBest && (
                          <Text style={[styles.bestCheck, { color: Colors.primary }]}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Work type pills */}
            {showWorkTypePills && (
              <>
                <View style={[styles.sectionDivider, { backgroundColor: border }]} />
                <View style={styles.pillsSection}>
                  <Text style={[styles.pillsSectionLabel, { color: textMuted }]}>
                    POTENTIAL WORK TYPES
                  </Text>
                  <View style={styles.pillsRow}>
                    {WORK_TYPE_SUGGESTIONS.map(wt => (
                      <TouchableOpacity
                        key={wt}
                        style={[styles.pill, { borderColor: border, backgroundColor: surface }]}
                        onPress={() => handleWorkTypeTap(wt)}
                      >
                        <Text style={[styles.pillText, { color: textPrimary }]}>{wt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Voice disambiguation hint */}
            {showVoiceHint && (
              <View style={[styles.voiceHint, { borderTopColor: border }]}>
                <Text style={[styles.voiceHintText, { color: textMuted }]}>
                  💬  Say: "First one", "Second one", or tap the correct order
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Bar
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    gap: Spacing.xs,
  },
  searchEmoji: { fontSize: 15 },
  input: {
    flex: 1,
    ...Typography.bodyMedium,
    paddingVertical: 0,
  },
  iconBtn: { padding: 3 },
  iconText: { fontSize: 17 },

  // Dropdown
  dropdown: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropHeaderLabel: {
    flex: 1,
    ...Typography.labelSmall,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  durationChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationChipText: { ...Typography.labelSmall, fontWeight: '700', fontSize: 11 },

  // Results
  resultsList: { maxHeight: 220 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  folderIcon: { fontSize: 16 },
  resultInfo: { flex: 1, minWidth: 0 },
  resultNum: { ...Typography.labelSmall, marginBottom: 1 },
  resultClient: { ...Typography.titleSmall },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recentBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  recentBadgeText: { fontSize: 10, fontWeight: '600' },
  bestCheck: { fontSize: 14, fontWeight: '700' },
  emptyRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: { ...Typography.bodySmall },

  // Pills
  sectionDivider: { height: StyleSheet.hairlineWidth },
  pillsSection: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  pillsSectionLabel: {
    ...Typography.labelSmall,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  pillText: { ...Typography.labelSmall, fontWeight: '600', fontSize: 12 },

  // Voice hint
  voiceHint: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  voiceHintText: {
    ...Typography.bodySmall,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
