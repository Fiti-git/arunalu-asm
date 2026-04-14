import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Image, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ENDPOINTS } from '../config';

const LOGO = require('../assets/logo.png');

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [helpVisible, setHelpVisible] = useState(false);
  const navigation = useNavigation();

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(ENDPOINTS.token, { username, password }, { timeout: 10000 });
      await AsyncStorage.multiSet([
        ['accessToken', data.access],
        ['refreshToken', data.refresh],
        ['alternate', 'true'],
      ]);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      setError(
        err.response
          ? 'Login failed: ' + (err.response.data.detail || JSON.stringify(err.response.data))
          : err.request
          ? 'Network error: No response from server'
          : 'Login failed: ' + err.message
      );
    } finally {
      setLoading(false);
    }
  }, [username, password, navigation]);

  const disabled = !username || !password || loading;

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>Arunalu ASM</Text>
            <Text style={styles.appSubtitle}>Attendance & Staff Management</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>! {error}</Text>
              </View>
            )}

            {/* Username */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIconText}>@</Text>
              <TextInput
                placeholder="Username"
                placeholderTextColor={GRAY}
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIconText}>*</Text>
              <TextInput
                placeholder="Password"
                placeholderTextColor={GRAY}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                <Text style={styles.eyeBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={RED} style={{ marginTop: 8 }} />
            ) : (
              <TouchableOpacity
                style={[styles.loginBtn, disabled && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={disabled}
                activeOpacity={0.85}
              >
                <Text style={[styles.loginBtnText, disabled && styles.loginBtnTextDisabled]}>
                  Sign In  →
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer help */}
          <TouchableOpacity onPress={() => setHelpVisible(true)} style={styles.helpLink}>
            <Text style={styles.helpLinkText}>? Need help?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Help Modal */}
      <Modal animationType="slide" transparent visible={helpVisible} onRequestClose={() => setHelpVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Need Help?</Text>
              <TouchableOpacity onPress={() => setHelpVisible(false)}>
                <Text style={styles.modalClose}>X</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalIcon}>T</Text>
              <Text style={styles.modalText}>0767032122</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalIcon}>W</Text>
              <Text style={styles.modalText}>fiti.solutions</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const RED    = '#A31E17';
const YELLOW = '#F1C40F';
const GRAY   = '#9CA3AF';

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: RED },

  bgTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', backgroundColor: RED },
  bgBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', backgroundColor: '#f5f5f5' },

  kav:    { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  logoArea:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, marginBottom: 14,
  },
  logoImg:     { width: 72, height: 72 },
  appName:     { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  appSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 20,
    elevation: 12, shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
  },
  cardTitle:    { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: GRAY, marginBottom: 20 },

  errorBox:  {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: RED,
  },
  errorText: { color: RED, fontSize: 13, lineHeight: 18 },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 12, marginBottom: 14, backgroundColor: '#FAFAFA',
  },
  inputIconText: { fontSize: 16, color: GRAY, marginRight: 10, fontWeight: '700' },
  input:         { flex: 1, fontSize: 16, color: '#111', paddingVertical: 14 },
  eyeBtn:        { padding: 4 },
  eyeBtnText:    { fontSize: 13, color: RED, fontWeight: '700' },

  loginBtn: {
    backgroundColor: YELLOW, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    elevation: 3, shadowColor: YELLOW, shadowOpacity: 0.4, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  loginBtnDisabled:     { backgroundColor: '#E5E7EB', elevation: 0 },
  loginBtnText:         { fontSize: 17, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
  loginBtnTextDisabled: { color: '#aaa' },

  helpLink:     { alignItems: 'center' },
  helpLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal:       { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%', elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: '700', color: '#111' },
  modalClose:  { fontSize: 16, fontWeight: '800', color: '#333', padding: 4 },
  modalRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  modalIcon:   { fontSize: 14, fontWeight: '800', color: RED, width: 20, textAlign: 'center' },
  modalText:   { fontSize: 16, color: '#555' },
});

export default LoginScreen;
