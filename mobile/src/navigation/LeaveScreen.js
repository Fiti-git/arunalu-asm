import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, ScrollView,
  TextInput, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';

import { ENDPOINTS } from '../config';
import { apiGet, apiPost } from '../api';
import BottomSheet from '../components/BottomSheet';

const SPECIAL_LEAVE_ID = 4;

const STATUS_COLOR = {
  approved: '#059669',
  rejected: '#DC2626',
  pending:  '#D97706',
  cancelled:'#6B7280',
};

const STATUS_ICON = {
  approved: '✓',
  rejected: '✗',
  pending:  '⏳',
  cancelled:'–',
};

// ─── Leave Screen ─────────────────────────────────────────────────────────────
const LeaveScreen = () => {
  const navigation = useNavigation();

  // Data
  const [balances, setBalances] = useState([]);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // Apply sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [leaveTypes, setLeaveTypes]     = useState([]);
  const [leaveType, setLeaveType]       = useState(null);
  const [leaveLimits, setLeaveLimits]   = useState({});
  const [selectedDates, setSelectedDates] = useState({});
  const [remarks, setRemarks]           = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, hist] = await Promise.all([
        apiGet(ENDPOINTS.pendingLeave),
        apiGet(ENDPOINTS.myLeaves),
      ]);
      setBalances(bal);
      setHistory(hist);

      // Pre-load leave types for apply sheet
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

  // ── Apply sheet ────────────────────────────────────────────────────────────
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
      return { ...prev, [dateString]: { selected: true, marked: true, selectedColor: '#2563EB' } };
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Leave</Text>
        <TouchableOpacity style={styles.applyHeaderBtn} onPress={openApply}>
          <Text style={styles.applyHeaderBtnText}>+ Apply</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Balances ── */}
          <Text style={styles.sectionTitle}>Leave Balances</Text>
          <View style={styles.card}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>Type</Text>
              <Text style={[styles.tableCell, styles.headerCell]}>Allowed</Text>
              <Text style={[styles.tableCell, styles.headerCell]}>Used</Text>
              <Text style={[styles.tableCell, styles.headerCell]}>Left</Text>
            </View>
            {balances.map(item => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.leave_type}</Text>
                <Text style={styles.tableCell}>{item.allowed}</Text>
                <Text style={styles.tableCell}>{item.used}</Text>
                <Text style={[styles.tableCell, styles.remainingCell]}>{item.remaining}</Text>
              </View>
            ))}
          </View>

          {/* ── History ── */}
          <Text style={styles.sectionTitle}>History</Text>
          {history.length === 0
            ? <Text style={styles.empty}>No leave records yet.</Text>
            : history.map(item => (
                <View key={item.leave_refno} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyType}>{item.leave_type_name || '—'}</Text>
                    <Text style={styles.historyDate}>{item.leave_date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#999') + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? '#999' }]}>
                      {STATUS_ICON[item.status] ?? '?'} {item.status}
                    </Text>
                  </View>
                </View>
              ))
          }
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
            theme={{ selectedDayBackgroundColor: '#2563EB', todayTextColor: '#2563EB' }}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const BLUE = '#2563EB';
const GRAY = '#6B7280';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderColor: '#f0f0f0',
  },
  backBtn:  { fontSize: 24, color: '#333', lineHeight: 28 },
  topTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  applyHeaderBtn: {
    backgroundColor: BLUE, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  applyHeaderBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 10, marginTop: 16 },

  // Balances table
  card: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 8,
  },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  tableHeader: { backgroundColor: '#F3F4F6' },
  tableCell:   { flex: 1, fontSize: 13, color: '#374151', textAlign: 'center' },
  headerCell:  { fontWeight: '700', color: '#111' },
  remainingCell: { color: BLUE, fontWeight: '700' },

  // History
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F3F4F6',
  },
  historyLeft: { flex: 1 },
  historyType: { fontSize: 14, fontWeight: '600', color: '#111' },
  historyDate: { fontSize: 12, color: GRAY, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:  { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  empty: { color: GRAY, textAlign: 'center', paddingVertical: 24 },

  // Apply sheet
  fieldLabel:    { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerWrapper: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  calendar:      { borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, overflow: 'hidden' },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111', textAlignVertical: 'top',
    marginBottom: 16, minHeight: 80,
  },
  submitBtn:         { backgroundColor: BLUE, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default LeaveScreen;
