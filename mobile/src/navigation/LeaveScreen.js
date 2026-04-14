import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, ScrollView,
  TextInput, StatusBar, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';

import { ENDPOINTS } from '../config';
import { apiGet, apiPost } from '../api';
import BottomSheet from '../components/BottomSheet';

const SPECIAL_LEAVE_ID = 4;
const HISTORY_PAGE_SIZE = 5;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

const RED    = '#A31E17';
const BROWN  = '#8C421F';
const YELLOW = '#F1C40F';
const GRAY   = '#6B7280';

const STATUS_COLOR = {
  approved: '#059669',
  rejected: '#DC2626',
  pending:  '#D97706',
  cancelled:'#6B7280',
};

const balanceColor = (remaining, allowed) => {
  if (!allowed) return '#6B7280';
  const ratio = remaining / allowed;
  if (ratio > 0.5) return '#059669';
  if (ratio > 0.2) return '#D97706';
  return '#DC2626';
};

const LeaveScreen = () => {
  const navigation = useNavigation();

  const [balances, setBalances] = useState([]);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const carouselRef     = useRef(null);
  const [cardIndex, setCardIndex] = useState(0);
  const autoScrollTimer = useRef(null);

  const [historyPage, setHistoryPage] = useState(1);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [leaveTypes, setLeaveTypes]     = useState([]);
  const [leaveType, setLeaveType]       = useState(null);
  const [leaveLimits, setLeaveLimits]   = useState({});
  const [selectedDates, setSelectedDates] = useState({});
  const [remarks, setRemarks]           = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, hist] = await Promise.all([
        apiGet(ENDPOINTS.pendingLeave),
        apiGet(ENDPOINTS.myLeaves),
      ]);
      setBalances(bal);
      setHistory(hist);
      setHistoryPage(1);

      const types = bal.map(t => ({ id: t.id, label: t.leave_type, remaining: t.remaining }));
      setLeaveTypes(types);
      setLeaveLimits(types.reduce((a, t) => ({ ...a, [t.id]: t.remaining }), {}));
      if (types.length) setLeaveType(types[0].id);
    } catch {
      Alert.alert('Error', 'Failed to load leave data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (balances.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setCardIndex(prev => {
        const next = (prev + 1) % balances.length;
        carouselRef.current?.scrollTo({ x: next * (CARD_WIDTH + 16), animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(autoScrollTimer.current);
  }, [balances.length]);

  const onCarouselScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
    setCardIndex(idx);
  };

  const totalHistoryPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const pagedHistory = history.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  const openApply = () => {
    setSelectedDates({});
    setRemarks('');
    setSheetVisible(true);
  };

  const handleDateSelect = (dateString) => {
    setSelectedDates(prev => {
      if (prev[dateString]) {
        const next = { ...prev };
        delete next[dateString];
        return next;
      }
      if (leaveType !== SPECIAL_LEAVE_ID) {
        const limit = leaveLimits[leaveType] ?? 0;
        if (Object.keys(prev).length >= limit) {
          Alert.alert('Limit reached', `Only ${limit} day(s) allowed.`);
          return prev;
        }
      }
      return { ...prev, [dateString]: { selected: true, marked: true, selectedColor: RED } };
    });
  };

  const handleSubmit = async () => {
    if (!Object.keys(selectedDates).length)
      return Alert.alert('Validation', 'Select at least one date.');
    if (leaveType === SPECIAL_LEAVE_ID && !remarks.trim())
      return Alert.alert('Validation', 'Please provide a reason for Special Leave.');

    try {
      setSubmitting(true);
      await apiPost(ENDPOINTS.applyLeave, {
        leave_type: leaveType,
        leave_dates: Object.keys(selectedDates),
        remarks: leaveType === SPECIAL_LEAVE_ID ? remarks : '',
      });
      setSheetVisible(false);
      Alert.alert('Success', 'Leave application submitted.');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPending  = history.filter(h => h.status === 'pending').length;
  const totalApproved = history.filter(h => h.status === 'approved').length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ── Red Header Banner ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={openApply}>
            <Text style={styles.applyBtnText}>+ Apply</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Leave</Text>
        <Text style={styles.headerSubtitle}>Manage your leave requests</Text>

        {/* Quick stats row inside header */}
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{balances.length}</Text>
            <Text style={styles.headerStatLabel}>Types</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{totalPending}</Text>
            <Text style={styles.headerStatLabel}>Pending</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{totalApproved}</Text>
            <Text style={styles.headerStatLabel}>Approved</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={RED} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Balance Carousel ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leave Balances</Text>

            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onCarouselScroll}
              onScrollEndDrag={onCarouselScroll}
              snapToInterval={CARD_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
            >
              {balances.map((item) => {
                const color = balanceColor(item.remaining, item.allowed);
                const progress = item.allowed > 0 ? (item.used / item.allowed) : 0;
                return (
                  <View key={item.id} style={[styles.balanceCard, { width: CARD_WIDTH }]}>
                    <View style={styles.balanceCardHeader}>
                      <Text style={styles.balanceTypeName}>{item.leave_type}</Text>
                      <View style={[styles.remainingBadge, { backgroundColor: color + '18', borderColor: color }]}>
                        <View style={[styles.remainingDot, { backgroundColor: color }]} />
                        <Text style={[styles.remainingBadgeText, { color }]}>
                          {item.remaining} left
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                      {item.used} of {item.allowed} days used
                    </Text>

                    <View style={styles.balanceRow}>
                      <View style={styles.balanceStat}>
                        <Text style={[styles.balanceStatValue, { color: '#D97706' }]}>{item.used}</Text>
                        <Text style={styles.balanceStatLabel}>Used</Text>
                      </View>
                      <View style={styles.balanceDivider} />
                      <View style={styles.balanceStat}>
                        <Text style={styles.balanceStatValue}>{item.allowed}</Text>
                        <Text style={styles.balanceStatLabel}>Total</Text>
                      </View>
                      <View style={styles.balanceDivider} />
                      <View style={styles.balanceStat}>
                        <Text style={[styles.balanceStatValue, { color }]}>{item.remaining}</Text>
                        <Text style={styles.balanceStatLabel}>Left</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {balances.length > 1 && (
              <View style={styles.dotsRow}>
                {balances.map((_, i) => (
                  <View key={i} style={[styles.dot, i === cardIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>

          {/* ── History Table ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leave History</Text>

            {history.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>{'\uD83D\uDCC2'}</Text>
                <Text style={styles.emptyText}>No leave records yet.</Text>
              </View>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.thCell, { flex: 2 }]}>Type</Text>
                  <Text style={styles.thCell}>Date</Text>
                  <Text style={styles.thCell}>Status</Text>
                </View>

                {pagedHistory.map((item, idx) => (
                  <View key={item.leave_refno} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                    <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>
                      {item.leave_type_name || '—'}
                    </Text>
                    <Text style={styles.tdCell}>{item.leave_date || '—'}</Text>
                    <View style={styles.tdCell}>
                      <Text style={[
                        styles.statusChip,
                        { color: STATUS_COLOR[item.status] ?? '#6B7280',
                          backgroundColor: (STATUS_COLOR[item.status] ?? '#6B7280') + '18' },
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                ))}

                {totalHistoryPages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[styles.pageBtn, historyPage === 1 && styles.pageBtnOff]}
                      onPress={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      <Text style={[styles.pageBtnTxt, historyPage === 1 && { color: '#ccc' }]}>{'<'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageLabel}>{historyPage} / {totalHistoryPages}</Text>
                    <TouchableOpacity
                      style={[styles.pageBtn, historyPage === totalHistoryPages && styles.pageBtnOff]}
                      onPress={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                      disabled={historyPage === totalHistoryPages}
                    >
                      <Text style={[styles.pageBtnTxt, historyPage === totalHistoryPages && { color: '#ccc' }]}>{'>'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

        </ScrollView>
      )}

      {/* ── Apply Leave Bottom Sheet ── */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Apply Leave"
        snapHeight={580}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Leave Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={leaveType} onValueChange={val => { setLeaveType(val); setSelectedDates({}); }}>
              {leaveTypes.map(t => (
                <Picker.Item key={t.id} label={`${t.label}  (${t.remaining} left)`} value={t.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Select Date(s)</Text>
          <Calendar
            onDayPress={day => handleDateSelect(day.dateString)}
            markedDates={selectedDates}
            markingType="multi-dot"
            style={styles.calendar}
            theme={{ selectedDayBackgroundColor: RED, todayTextColor: RED }}
          />

          {leaveType === SPECIAL_LEAVE_ID && (
            <>
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                style={styles.textInput}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Enter reason for Special Leave"
                multiline
                numberOfLines={3}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Submit Application</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header
  header: {
    backgroundColor: RED, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn:     { padding: 4 },
  backBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  applyBtn: {
    backgroundColor: YELLOW, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    elevation: 2, shadowColor: YELLOW, shadowOpacity: 0.4, shadowRadius: 6,
  },
  applyBtnText: { color: '#1a1a1a', fontWeight: '800', fontSize: 14 },

  headerTitle:    { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, marginBottom: 16 },

  headerStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8,
  },
  headerStat:        { flex: 1, alignItems: 'center' },
  headerStatValue:   { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerStatLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 14 },

  // Carousel
  carouselContent: { gap: 16, paddingRight: 16 },
  balanceCard: {
    backgroundColor: '#FFFBF0', borderRadius: 16,
    padding: 16, borderWidth: 1.5, borderColor: YELLOW,
  },
  balanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  balanceTypeName:   { fontSize: 16, fontWeight: '800', color: '#111', flex: 1 },
  remainingBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  remainingDot:      { width: 7, height: 7, borderRadius: 3.5 },
  remainingBadgeText:{ fontSize: 12, fontWeight: '700' },

  progressTrack:  { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 6, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 4 },
  progressLabel:  { fontSize: 11, color: GRAY, marginBottom: 14 },

  balanceRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceStat:      { flex: 1, alignItems: 'center' },
  balanceStatValue: { fontSize: 22, fontWeight: '800', color: '#111' },
  balanceStatLabel: { fontSize: 11, color: GRAY, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceDivider:   { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  dotsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { width: 18, backgroundColor: RED },

  // History table
  emptyBox:  { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14, color: GRAY },

  tableHeader: {
    flexDirection: 'row', backgroundColor: '#F9FAFB',
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8, marginBottom: 4,
  },
  thCell: {
    flex: 1, fontSize: 11, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center',
  },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FAFAFA', borderRadius: 6 },
  tdCell:      { flex: 1, fontSize: 13, color: '#374151', textAlign: 'center' },
  statusChip:  {
    fontSize: 11, fontWeight: '700', textTransform: 'capitalize',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    overflow: 'hidden', textAlign: 'center',
  },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, gap: 16,
  },
  pageBtn:    { padding: 8 },
  pageBtnOff: { opacity: 0.4 },
  pageBtnTxt: { fontSize: 18, fontWeight: '700', color: RED },
  pageLabel:  { fontSize: 13, fontWeight: '600', color: GRAY },

  // Sheet form
  fieldLabel:    { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerWrapper: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  calendar:      { borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, overflow: 'hidden' },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111', textAlignVertical: 'top',
    marginBottom: 16, minHeight: 80,
  },
  submitBtn:         { backgroundColor: RED, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default LeaveScreen;
