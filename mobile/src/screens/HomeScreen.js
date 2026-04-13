import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, SafeAreaView, Image, Alert, PermissionsAndroid,
  StatusBar, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';

import { ENDPOINTS } from '../config';
import { decodeJWT, getToken, apiGet, apiFormPost } from '../api';
import BottomSheet from '../components/BottomSheet';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmtDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

// ─── Component ───────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const navigation = useNavigation();

  // User
  const [userName, setUserName] = useState('');

  // Punch state: 'loading' | 'out' | 'in'
  const [punchState, setPunchState] = useState('loading');
  const [checkInTime, setCheckInTime] = useState('');

  // Summary
  const [totalLeaveRemaining, setTotalLeaveRemaining] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);

  // Menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Bottom sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Fetching location…');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [selfieUri, setSelfieUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load user info ─────────────────────────────────────────────────────────
  useEffect(() => {
    getToken().then(token => {
      if (token) {
        const d = decodeJWT(token);
        setUserName(d?.username || d?.name || '');
      }
    });
  }, []);

  // ── Fetch punch state & summaries ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    setPunchState('loading');
    try {
      const [todayRes, leavesRes, historyRes] = await Promise.all([
        apiGet(ENDPOINTS.todayAttendance),
        apiGet(ENDPOINTS.pendingLeave),
        apiGet(ENDPOINTS.myLeaves),
      ]);

      setPunchState(todayRes.punched_in ? 'in' : 'out');
      setCheckInTime(todayRes.check_in_time || '');

      const total = leavesRes.reduce((s, t) => s + t.remaining, 0);
      setTotalLeaveRemaining(total);

      setRecentLeaves(historyRes.slice(0, 5));
    } catch {
      setPunchState('out');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Bottom sheet open ──────────────────────────────────────────────────────
  const openSheet = useCallback(() => {
    setSelfieUri(null);
    setGpsCoords(null);
    setGpsStatus('Fetching location…');
    setSubmitting(false);
    setSheetVisible(true);
    fetchGPS();
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
  }, []);

  // ── GPS ───────────────────────────────────────────────────────────────────
  const fetchGPS = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: 'Location', message: 'Needed for attendance.', buttonPositive: 'OK' }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setGpsStatus('Location permission denied');
        return;
      }
    } catch { setGpsStatus('Permission error'); return; }

    Geolocation.getCurrentPosition(
      pos => {
        setGpsCoords(pos.coords);
        setGpsStatus(`📍 ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      err => setGpsStatus(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ── Selfie ────────────────────────────────────────────────────────────────
  const takeSelfie = async () => {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Camera permission denied');
        return;
      }
    } catch { return; }

    launchCamera({ mediaType: 'photo', cameraType: 'front', includeBase64: false }, async res => {
      const asset = res?.assets?.[0];
      if (!asset?.uri) return;
      try {
        const resized = await ImageResizer.createResizedImage(asset.uri, 224, 224, 'JPEG', 90);
        setSelfieUri(resized.uri);
      } catch {
        Alert.alert('Error', 'Could not resize image');
      }
    });
  };

  // ── Submit punch ──────────────────────────────────────────────────────────
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
      setSuccessMsg(isPunchIn ? '✓ Punched in successfully' : '✓ Punched out successfully');
      setTimeout(() => setSuccessMsg(''), 3500);
      await loadData();
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setMenuOpen(false);
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'alternate']);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isPunchIn = punchState === 'out';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>{greeting()}, {userName || 'there'}</Text>
          <Text style={styles.dateText}>{fmtDate()}</Text>
        </View>
        <Pressable onPress={() => setMenuOpen(p => !p)} hitSlop={10} style={styles.menuBtn}>
          <Text style={styles.menuBtnText}>≡</Text>
        </Pressable>
      </View>

      {menuOpen && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity onPress={() => { setMenuOpen(false); navigation.navigate('Leave'); }}>
            <Text style={styles.menuItem}>Leave</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity onPress={handleLogout}>
            <Text style={[styles.menuItem, { color: '#e74c3c' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Status block ── */}
        <View style={styles.statusBlock}>
          {punchState === 'loading' ? (
            <ActivityIndicator size="large" color="#3498db" />
          ) : (
            <>
              <Text style={[styles.statusLabel, punchState === 'in' && styles.statusLabelIn]}>
                {punchState === 'in' ? `CHECKED IN` : 'NOT CHECKED IN'}
              </Text>
              {punchState === 'in' && checkInTime
                ? <Text style={styles.statusSub}>Since {checkInTime}</Text>
                : null}
              <View style={[styles.statusBar, punchState === 'in' && styles.statusBarIn]} />
            </>
          )}
        </View>

        {/* ── Primary CTA ── */}
        {punchState !== 'loading' && (
          <TouchableOpacity
            style={[styles.ctaBtn, !isPunchIn && styles.ctaBtnOut]}
            onPress={openSheet}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>
              {isPunchIn ? 'PUNCH IN' : 'PUNCH OUT'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Success flash ── */}
        {!!successMsg && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* ── Summary chips ── */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>
              {totalLeaveRemaining !== null ? totalLeaveRemaining : '—'}
            </Text>
            <Text style={styles.chipLabel}>Leave days{'\n'}remaining</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{recentLeaves.length}</Text>
            <Text style={styles.chipLabel}>Leave{'\n'}requests</Text>
          </View>
        </View>

        {/* ── Recent activity ── */}
        {recentLeaves.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Leave Activity</Text>
            {recentLeaves.map(item => (
              <View key={item.leave_refno} style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityType}>{item.leave_type_name || '—'}</Text>
                  <Text style={styles.activityDate}>{item.add_date || '—'}</Text>
                </View>
                <Text style={[
                  styles.activityStatus,
                  item.status === 'approved' && styles.statusApproved,
                  item.status === 'rejected' && styles.statusRejected,
                ]}>
                  {item.status}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* ── Punch Bottom Sheet ── */}
      <BottomSheet
        visible={sheetVisible}
        onClose={closeSheet}
        title={isPunchIn ? 'Punch In' : 'Punch Out'}
        snapHeight={480}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Selfie preview */}
          <View style={styles.selfieBox}>
            {selfieUri
              ? <Image source={{ uri: selfieUri }} style={styles.selfieImg} />
              : <View style={styles.selfiePlaceholder}>
                  <Text style={styles.selfieIcon}>📷</Text>
                  <Text style={styles.selfiePlaceholderText}>No selfie taken</Text>
                </View>
            }
          </View>

          {/* GPS status */}
          <Text style={styles.gpsText}>{gpsStatus}</Text>

          {/* Time */}
          <Text style={styles.sheetTime}>
            🕐 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>

          {/* Take/Retake selfie */}
          <TouchableOpacity style={styles.selfieBtn} onPress={takeSelfie} disabled={submitting}>
            <Text style={styles.selfieBtnText}>{selfieUri ? 'Retake Selfie' : 'Take Selfie'}</Text>
          </TouchableOpacity>

          {/* Confirm */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!selfieUri || !gpsCoords || submitting) && styles.confirmBtnDisabled,
              !isPunchIn && styles.confirmBtnOut,
            ]}
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
const BLUE  = '#2563EB';
const RED   = '#DC2626';
const GRAY  = '#6B7280';
const LIGHT = '#F3F4F6';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  greetingText: { fontSize: 20, fontWeight: '700', color: '#111' },
  dateText:     { fontSize: 13, color: GRAY, marginTop: 2 },
  menuBtn:      { padding: 4 },
  menuBtnText:  { fontSize: 26, color: '#333', lineHeight: 28 },

  // Dropdown
  dropdownMenu: {
    position: 'absolute', top: 64, right: 20, backgroundColor: '#fff',
    borderRadius: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    width: 160, zIndex: 99, paddingVertical: 6,
  },
  menuItem:    { fontSize: 16, color: '#111', paddingVertical: 12, paddingHorizontal: 18 },
  menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 12 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Status block
  statusBlock: { alignItems: 'flex-start', paddingTop: 32, paddingBottom: 24 },
  statusLabel: { fontSize: 32, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  statusLabelIn: { color: BLUE },
  statusSub:   { fontSize: 14, color: GRAY, marginTop: 4 },
  statusBar:   { width: 60, height: 3, backgroundColor: '#ddd', borderRadius: 2, marginTop: 10 },
  statusBarIn: { backgroundColor: BLUE, width: 100 },

  // Primary CTA
  ctaBtn: {
    backgroundColor: BLUE, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginBottom: 16, elevation: 3,
    shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  ctaBtnOut:  { backgroundColor: RED, shadowColor: RED },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 1.5 },

  // Success banner
  successBanner: {
    backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12,
    marginBottom: 16, alignItems: 'center',
  },
  successText: { color: '#065F46', fontWeight: '600', fontSize: 15 },

  // Chips
  chipsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  chip: {
    flex: 1, backgroundColor: LIGHT, borderRadius: 14, padding: 16, alignItems: 'center',
  },
  chipValue: { fontSize: 28, fontWeight: '800', color: '#111' },
  chipLabel: { fontSize: 12, color: GRAY, textAlign: 'center', marginTop: 4, lineHeight: 18 },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 12 },
  activityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5',
  },
  activityDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE, marginRight: 12 },
  activityInfo:  { flex: 1 },
  activityType:  { fontSize: 14, fontWeight: '600', color: '#222' },
  activityDate:  { fontSize: 12, color: GRAY, marginTop: 2 },
  activityStatus: { fontSize: 12, fontWeight: '600', color: GRAY, textTransform: 'capitalize' },
  statusApproved: { color: '#059669' },
  statusRejected: { color: RED },

  // Sheet internals
  selfieBox: { alignItems: 'center', marginBottom: 12 },
  selfieImg: { width: 180, height: 180, borderRadius: 12 },
  selfiePlaceholder: {
    width: 180, height: 180, borderRadius: 12,
    backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  selfieIcon:          { fontSize: 36, marginBottom: 8 },
  selfiePlaceholderText: { fontSize: 13, color: GRAY },

  gpsText:   { fontSize: 13, color: GRAY, textAlign: 'center', marginBottom: 4 },
  sheetTime: { fontSize: 13, color: GRAY, textAlign: 'center', marginBottom: 16 },

  selfieBtn: {
    borderWidth: 1.5, borderColor: BLUE, borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginBottom: 10,
  },
  selfieBtnText: { color: BLUE, fontWeight: '700', fontSize: 15 },

  confirmBtn: {
    backgroundColor: BLUE, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', elevation: 2,
  },
  confirmBtnOut:      { backgroundColor: RED },
  confirmBtnDisabled: { backgroundColor: '#9CA3AF' },
  confirmBtnText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default HomeScreen;
