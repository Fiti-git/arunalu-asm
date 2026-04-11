import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const navigation = useNavigation();

  const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  };

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'http://123.231.60.24:1605/api/token/',
        {
          username,
          password,
        },
        { timeout: 10000 }
      );

      if (response.status === 200) {
        const accessToken = response.data.access;
        const refreshToken = response.data.refresh;

        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);

        const decoded = decodeJWT(accessToken);
        console.log('Decoded JWT:', decoded);

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'CDR',
              params: {
                userId: decoded.user_id,
                name: decoded.name,
                role: decoded.role,
              },
            },
          ],
        });
      } else {
        setError('Unexpected server response');
      }
    } catch (err) {
      if (err.response) {
        setError('Login failed: ' + (err.response.data.detail || JSON.stringify(err.response.data)));
      } else if (err.request) {
        setError('Network error: No response from server');
      } else {
        setError('Login failed: ' + err.message);
      }
    }

    setLoading(false);
  }, [username, password, navigation]);

  const toggleMenu = useCallback(() => {
    setShowMenu((prev) => !prev);
  }, []);

  const showHelpInfo = useCallback(() => {
    setHelpModalVisible(true);
  }, []);

  const closeHelpModal = () => setHelpModalVisible(false);

  const isLoginButtonDisabled = !username || !password || loading;

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      }}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <TouchableOpacity style={styles.menuIcon} onPress={toggleMenu}>
        <Icon name="bars" size={30} color="white" />
      </TouchableOpacity>

      {showMenu && (
        <View style={styles.dropdown}>
          <TouchableOpacity onPress={showHelpInfo}>
            <Text style={styles.menuItem}>Help</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Login to Your Account</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#3498db" />
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isLoginButtonDisabled ? '#b0bec5' : '#3498db' },
            ]}
            onPress={handleLogin}
            disabled={isLoginButtonDisabled}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ✅ Help Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={helpModalVisible}
        onRequestClose={closeHelpModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Need Help?</Text>
              <Pressable onPress={closeHelpModal}>
            
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              
              <Text style={styles.modalText}>Phone: 0767032122</Text>

              
              <Text style={styles.modalText}>Website: fiti.solutions</Text>
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={closeHelpModal}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImageStyle: {
    opacity: 0.9,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '80%',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 10,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    justifyContent: 'center',
    elevation: 5,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 10,
  },
  menuIcon: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 5,
    padding: 10,
    width: 150,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  menuItem: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    color: '#1976d2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    marginVertical: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  modalButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default LoginScreen;
