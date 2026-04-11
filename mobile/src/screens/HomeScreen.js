import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState({ name: '', userId: '', role: '' });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const decoded = decodeJWT(token);
          if (decoded) {
            setUser({
              name: decoded.name || '',
              userId: decoded.user_id || '',
              role: decoded.role || '',
            });
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleAttendance = () => {
    navigation.navigate('Attendance');
  };

  const handleLeave = () => {
    navigation.navigate('Leave');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.container}>
        {/* Title with blue line */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Hello, {user.name || 'Guest'}!</Text>
          <View style={styles.userInfo}>
          <Text style={styles.info}>User ID: {user.userId}</Text>
          <Text style={styles.info}>Role: {user.role}</Text>
        </View>
          <View style={styles.underline} />
        </View>

  
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleAttendance}>
            <Text style={styles.buttonText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleLeave}>
            <Text style={styles.buttonText}>Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover', // Ensures image covers the entire screen
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImageStyle: {
    opacity: 0.9, // Optional: Add some opacity to the background image for better text readability
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  titleContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  underline: {
    width: '50%',
    height: 2,
    backgroundColor: '#3498db', // Blue color for the underline
    marginTop: 5,
  },
  userInfo: {
    alignItems: 'left',
    marginTop: 20,
  },
  info: {
    fontSize: 18,
    color: '#fff',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    justifyContent: 'center',
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    marginLeft: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#c0392b',
  },
});

export default HomeScreen;
