import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ImageBackground, Modal, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ENDPOINTS } from '../config';
import { decodeJWT } from '../api';

const BG_IMAGE = 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
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
    <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bg} imageStyle={{ opacity: 0.9 }}>
      <TouchableOpacity style={styles.menuIcon} onPress={() => setShowMenu(p => !p)}>
        <Text style={styles.menuIconText}>⋮</Text>
      </TouchableOpacity>

      {showMenu && (
        <View style={styles.dropdown}>
          <TouchableOpacity onPress={() => { setShowMenu(false); setHelpVisible(true); }}>
            <Text style={styles.menuItem}>Help</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        <Text style={styles.title}>Login to Your Account</Text>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          placeholder="Username"
          placeholderTextColor="#666"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#3498db" />
        ) : (
          <TouchableOpacity
            style={[styles.button, disabled && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={disabled}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal animationType="slide" transparent visible={helpVisible} onRequestClose={() => setHelpVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Need Help?</Text>
            <Text style={styles.modalText}>Phone: 0767032122</Text>
            <Text style={styles.modalText}>Website: fiti.solutions</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setHelpVisible(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, width: '80%' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 24, textAlign: 'center' },
  input: {
    width: '100%', padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#fff', borderRadius: 10,
    fontSize: 16, color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)',
  },
  errorText: { color: '#ff6b6b', marginBottom: 12, fontSize: 14, textAlign: 'center' },
  button: {
    width: '100%', backgroundColor: '#3498db',
    borderRadius: 10, padding: 15, alignItems: 'center', elevation: 5,
  },
  buttonDisabled: { backgroundColor: '#b0bec5' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  menuIcon: { position: 'absolute', top: 44, right: 20, zIndex: 1, padding: 6 },
  menuIconText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  dropdown: {
    position: 'absolute', top: 80, right: 20, backgroundColor: '#fff',
    borderRadius: 8, elevation: 5, padding: 4, width: 130, zIndex: 2,
  },
  menuItem: { fontSize: 16, paddingVertical: 10, paddingHorizontal: 16, color: '#1976d2' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%', elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modalText: { fontSize: 16, color: '#555', marginBottom: 6 },
  modalBtn: { backgroundColor: '#3498db', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 16 },
  modalBtnText: { color: '#fff', fontSize: 16 },
});

export default LoginScreen;
