import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, SafeAreaView, Image, Alert, PermissionsAndroid,
  StatusBar, Pressable, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';

import { ENDPOINTS } from '../config';
import { decodeJWT, getToken, apiGet, apiFormPost } from '../api';
import BottomSheet from '../components/BottomSheet';

const { width: SW } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmtDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

const fmtTime = (timeStr) => {
  if (!timeStr) return '--:--';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return timeStr; }
};

const getFirstName = (decoded) => {
  if (decoded?.first_name) return decoded.first_name;
  if (decoded?.name) return decoded.name.split(' ')[0];
  const raw = decoded?.username || '';
  return raw.split(/[_.\s]/)[0].replace(/^\w/, c => c.toUpperCase());
};

const PAGE_SIZE = 5;

const STATUS_COLOR = { approved: '#059669', rejected: '#DC2626', pending: '#D97706', cancelled: '#6B7280' };

// ─── Component ───────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const navigation = useNavigation();

  const [firstName, setFirstName]     = useState('');
  const [punchState, setPunchState]   = useState('loading');
  const [checkInTime, setCheckInTime] = useState('');
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [leaveCount, setLeaveCount]   = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [gpsStatus, setGpsStatus]     = useState('Fetching location...');
  const [gpsCoords, setGpsCoords]     = useState(null);
  const [selfieUri, setSelfieUri]     = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');

  useEffect(() => {
    getToken().then(token => {
      if (token) { const d = decodeJWT(token); setFirstName(getFirstName(d)); }
    });
  }, []);

  const loadData = useCallback(async () => {
    setPunchState('loading');
    try {
      const [todayRes, historyRes] = await Promise.all([
        apiGet(ENDPOINTS.todayAttendance),
        apiGet(ENDPOINTS.myLeaves),
      ]);
      setPunchState(todayRes.punched_in ? 'in' : 'out');
      setCheckInTime(todayRes.check_in_time || '');
      setRecentLeaves(historyRes);
      setLeaveCount(historyRes.length);
    } catch { setPunchState('out'); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalPages  = Math.max(1, Math.ceil(recentLeaves.length / PAGE_SIZE));
  const pagedLeaves = recentLeaves.slice((activityPage - 1) * PAGE_SIZE, activityPage * PAGE_SIZE);

  const openSheet = useCallback(() => {
    setSelfieUri(null); setGpsCoords(null);
    setGpsStatus('Fetching location...'); setSubmitting(false);
    setSheetVisible(true); fetchGPS();
  }, []);

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const fetchGPS = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: 'Location', message: 'Needed for attendance.', buttonPositive: 'OK' }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) { setGpsStatus('Location permission denied'); return; }
    } catch { setGpsStatus('Permission error'); return; }
    Geolocation.getCurrentPosition(
      pos => { setGpsCoords(pos.coords); setGpsStatus(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); },
      err => setGpsStatus(`Error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const takeSelfie = async () => {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) { Alert.alert('Camera permission denied'); return; }
    } catch { return; }
    launchCamera({ mediaType: 'photo', cameraType: 'front', includeBase64: false }, async res => {
      const asset = res?.assets?.[0];
      if (!asset?.uri) return;
      try {
        const resized = await ImageResizer.createResizedImage(asset.uri, 224, 224, 'JPEG', 90);
        setSelfieUri(resized.uri);
      } catch { Alert.alert('Error', 'Could not resize image'); }
    });
  };

  const submitPunch = async () => {
    if (!gpsCoords) { Alert.alert('Wait', 'Location not ready yet.'); return; }
    if (!selfieUri) { Alert.alert('Selfie required', 'Please take a selfie first.'); return; }
    const isPunchIn = punchState === 'out';
    const endpoint = isPunchIn ? ENDPOINTS.punchIn : ENDPOINTS.punchOut;
    const photoKey = isPunchIn ? 'photo_check_in' : 'photo_check_out';
    const latKey   = isPunchIn ? 'check_in_lat'   : 'check_out_lat';
    const longKey  = isPunchIn ? 'check_in_long'  : 'check_out_long';
    const form = new FormData();
    const uri = selfieUri.startsWith('file://') ? selfieUri : `file://${selfieUri}`;
    form.append(photoKey, { uri, type: 'image/jpeg', name: 'selfie.jpg' });
    form.append(latKey,  gpsCoords.latitude.toString());
    form.append(longKey, gpsCoords.longitude.toString());
    form.append('dateTime', new Date().toISOString());
    try {
      setSubmitting(true);
      await apiFormPost(endpoint, form);
      closeSheet();
      setSuccessMsg(isPunchIn ? 'Punched in successfully' : 'Punched out successfully');
      setTimeout(() => setSuccessMsg(''), 3500);
      await loadData();
    } catch (err) { Alert.alert('Failed', err.message); }
    finally { setSubmitting(false); }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'alternate']);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const isPunchIn = punchState === 'out';
  const now = new Date();
  const timeNow = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* ── Coloured header banner ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>{greeting()},</Text>
            <Text style={styles.nameText}>{firstName || 'there'}</Text>
            <Text style={styles.dateText}>{fmtDate()}</Text>
          </View>
          <Pressable onPress={() => setMenuOpen(p => !p)} hitSlop={12} style={styles.menuBtn}>
            <Text style={styles.menuBtnText}>{'\u22EE'}</Text>
          </Pressable>
        </View>

        {/* Live clock */}
        <Text style={styles.headerClock}>{timeNow}</Text>

        {/* Attendance status pill */}
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, punchState === 'in' && styles.statusDotIn]} />
          <Text style={styles.statusPillText}>
            {punchState === 'loading' ? 'Loading...' : punchState === 'in' ? 'Checked In' : 'Not Checked In'}
          </Text>
          {punchState === 'in' && checkInTime
            ? <Text style={styles.statusPillSince}> since {fmtTime(checkInTime)}</Text>
            : null}
        </View>
      </View>

      {menuOpen && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity onPress={handleLogout} style={styles.menuItemRow}>
            <Text style={styles.menuItemIcon}>{'\u2192'}</Text>
            <Text style={[styles.menuItem, { color: '#e74c3c' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Action cards ── */}
        <View style={styles.actionRow}>
          {/* Punch card */}
          {punchState === 'loading' ? (
            <View style={[styles.actionCard, styles.actionCardPunch, { justifyContent: 'center' }]}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardPunch, !isPunchIn && styles.actionCardOut]}
              onPress={openSheet}
              activeOpacity={0.85}
            >
              <Text style={styles.actionCardEmoji}>{isPunchIn ? '\u{1F4F2}' : '\u{1F6AA}'}</Text>
              <Text style={styles.actionCardTitle}>{isPunchIn ? 'PUNCH IN' : 'PUNCH OUT'}</Text>
              <Text style={styles.actionCardSub}>{isPunchIn ? 'Tap to check in' : 'Tap to check out'}</Text>
              {checkInTime ? (
                <View style={styles.actionCardInfo}>
                  <Text style={styles.actionCardInfoText}>Last in: {fmtTime(checkInTime)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}

          {/* Leave card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardLeave]}
            onPress={() => navigation.navigate('Leave')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionCardEmojiDark}>{'\uD83D\uDCC5'}</Text>
            <Text style={styles.actionCardTitleDark}>LEAVE</Text>
            <Text style={styles.actionCardSubDark}>Manage leave</Text>
            {leaveCount > 0 && (
              <View style={styles.leaveBadge}>
                <Text style={styles.leaveBadgeText}>{leaveCount} requests</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Success flash ── */}
        {!!successMsg && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{'\u2713'} {successMsg}</Text>
          </View>
        )}

        {/* ── Today summary row ── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fmtTime(checkInTime) === '--:--' ? '--' : fmtTime(checkInTime)}</Text>
            <Text style={styles.summaryLabel}>Check In</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E5E7EB' }]}>
            <Text style={styles.summaryValue}>{leaveCount}</Text>
            <Text style={styles.summaryLabel}>Leave Requests</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: punchState === 'in' ? '#059669' : RED }]}>
              {punchState === 'loading' ? '...' : punchState === 'in' ? 'IN' : 'OUT'}
            </Text>
            <Text style={styles.summaryLabel}>Status</Text>
          </View>
        </View>

        {/* ── Recent activity ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Leave Activity</Text>

          {recentLeaves.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDCC2'}</Text>
              <Text style={styles.emptyText}>No leave activity yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 2 }]}>Type</Text>
                <Text style={styles.thCell}>Date</Text>
                <Text style={styles.thCell}>Status</Text>
              </View>

              {pagedLeaves.map((item, idx) => (
                <View key={item.leave_refno} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>
                    {item.leave_type_name || '—'}
                  </Text>
                  <Text style={styles.tdCell}>{item.add_date || '—'}</Text>
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

              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, activityPage === 1 && styles.pageBtnOff]}
                    onPress={() => setActivityPage(p => Math.max(1, p - 1))}
                    disabled={activityPage === 1}
                  >
                    <Text style={[styles.pageBtnTxt, activityPage === 1 && { color: '#ccc' }]}>{'<'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageLabel}>{activityPage} / {totalPages}</Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, activityPage === totalPages && styles.pageBtnOff]}
                    onPress={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                    disabled={activityPage === totalPages}
                  >
                    <Text style={[styles.pageBtnTxt, activityPage === totalPages && { color: '#ccc' }]}>{'>'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

      </ScrollView>

      {/* ── Punch Bottom Sheet ── */}
      <BottomSheet visible={sheetVisible} onClose={closeSheet}
        title={isPunchIn ? 'Punch In' : 'Punch Out'} snapHeight={480}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.selfieBox}>
            {selfieUri
              ? <Image source={{ uri: selfieUri }} style={styles.selfieImg} />
              : <View style={styles.selfiePlaceholder}>
                  <Text style={styles.selfieIcon}>{'\uD83D\uDCF7'}</Text>
                  <Text style={styles.selfiePlaceholderText}>No selfie taken</Text>
                </View>
            }
          </View>
          <Text style={styles.gpsText}>{'\u25CE'} {gpsStatus}</Text>
          <Text style={styles.sheetTime}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <TouchableOpacity style={styles.selfieBtn} onPress={takeSelfie} disabled={submitting}>
            <Text style={styles.selfieBtnText}>{selfieUri ? 'Retake Selfie' : 'Take Selfie'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn,
              (!selfieUri || !gpsCoords || submitting) && styles.confirmBtnDisabled,
              !isPunchIn && styles.confirmBtnOut]}
            onPress={submitPunch}
            disabled={!selfieUri || !gpsCoords || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>
                  {isPunchIn ? 'Confirm Punch In' : 'Confirm Punch Out'}
                </Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const RED    = '#A31E17';
const BROWN  = '#8C421F';
const YELLOW = '#F1C40F';
const LIGHT  = '#F7E0A2';
const GRAY   = '#6B7280';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header
  header: {
    backgroundColor: RED, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetingText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  nameText:    { fontSize: 26, color: '#fff', fontWeight: '800', marginTop: 2 },
  dateText:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  menuBtn:     { padding: 4, marginTop: 4 },
  menuBtnText: { fontSize: 26, color: '#fff', lineHeight: 30 },

  headerClock: {
    fontSize: 48, fontWeight: '800', color: '#fff',
    letterSpacing: -1, marginTop: 12, marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
  },
  statusDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6B7280', marginRight: 8 },
  statusDotIn:  { backgroundColor: '#4ADE80' },
  statusPillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusPillSince: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  // Dropdown
  dropdownMenu: {
    position: 'absolute', top: 70, right: 20, backgroundColor: '#fff',
    borderRadius: 12, elevation: 8, width: 150, zIndex: 99, paddingVertical: 6,
  },
  menuItemRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, gap: 10 },
  menuItemIcon: { fontSize: 16, color: '#e74c3c' },
  menuItem:     { fontSize: 16 },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  // Action cards
  actionRow:       { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionCard:      {
    flex: 1, borderRadius: 18, padding: 18, minHeight: 160,
    justifyContent: 'space-between',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  actionCardPunch: { backgroundColor: RED },
  actionCardOut:   { backgroundColor: BROWN },
  actionCardLeave: { backgroundColor: '#fff', borderWidth: 2, borderColor: YELLOW },

  actionCardEmoji:    { fontSize: 32, marginBottom: 8 },
  actionCardEmojiDark: { fontSize: 32, marginBottom: 8 },
  actionCardTitle:    { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  actionCardTitleDark:{ fontSize: 16, fontWeight: '800', color: BROWN, letterSpacing: 1 },
  actionCardSub:      { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  actionCardSubDark:  { fontSize: 12, color: GRAY, marginTop: 2 },
  actionCardInfo:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 6, marginTop: 8 },
  actionCardInfoText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  leaveBadge:     { backgroundColor: RED, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  leaveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Success
  successBanner: {
    backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14,
    marginBottom: 12, alignItems: 'center',
  },
  successText: { color: '#065F46', fontWeight: '700', fontSize: 14 },

  // Summary row
  summaryRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    marginBottom: 16, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Activity section
  section:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 12 },

  emptyBox:   { alignItems: 'center', paddingVertical: 32 },
  emptyIcon:  { fontSize: 36, marginBottom: 8 },
  emptyText:  { fontSize: 14, color: GRAY },

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
  statusChip:  { fontSize: 11, fontWeight: '700', textTransform: 'capitalize', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', textAlign: 'center' },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, gap: 16,
  },
  pageBtn:    { padding: 8 },
  pageBtnOff: { opacity: 0.4 },
  pageBtnTxt: { fontSize: 18, fontWeight: '700', color: RED },
  pageLabel:  { fontSize: 13, fontWeight: '600', color: GRAY },

  // Sheet
  selfieBox: { alignItems: 'center', marginBottom: 12 },
  selfieImg:  { width: 180, height: 180, borderRadius: 12 },
  selfiePlaceholder: {
    width: 180, height: 180, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  selfieIcon:           { fontSize: 40, marginBottom: 8 },
  selfiePlaceholderText:{ fontSize: 13, color: GRAY },
  gpsText:   { fontSize: 13, color: GRAY, textAlign: 'center', marginBottom: 4 },
  sheetTime: { fontSize: 13, color: GRAY, textAlign: 'center', marginBottom: 16 },
  selfieBtn: {
    borderWidth: 1.5, borderColor: RED, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginBottom: 10,
  },
  selfieBtnText: { color: RED, fontWeight: '700', fontSize: 15 },
  confirmBtn: { backgroundColor: RED, borderRadius: 12, paddingVertical: 16, alignItems: 'center', elevation: 2 },
  confirmBtnOut:      { backgroundColor: BROWN },
  confirmBtnDisabled: { backgroundColor: '#9CA3AF' },
  confirmBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default HomeScreen;
