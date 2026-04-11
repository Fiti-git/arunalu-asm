import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PunchOutScreen = ({ route, navigation }) => {
  const { location, dateTime } = route.params || {};
  const [selfieUri, setSelfieUri] = useState(route.params?.selfieUri || '');
  const [loading, setLoading] = useState(false);
  const [punchedIn, setPunchedIn] = useState(false);
  const [isDeviceVerified, setIsDeviceVerified] = useState(false);

  useEffect(() => {
    const checkDeviceVerification = async () => {
      const authorized = await AsyncStorage.getItem('authorized');
      if (authorized === 'true') {
        setIsDeviceVerified(true);
      }
    };
    checkDeviceVerification();
  }, []);

  const uploadSelfie = async () => {
    if (!location || !location.latitude || !location.longitude) {
      Alert.alert('Location Error', 'Location data is missing.');
      return null;
    }

    const token = await AsyncStorage.getItem('accessToken');
    const authorized = await AsyncStorage.getItem('authorized');
    const data = new FormData();

    if (selfieUri) {
      let uploadUri = selfieUri.startsWith('file://') ? selfieUri : `file://${selfieUri}`;
      data.append('photo_check_out', {
        uri: uploadUri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      });
    }

    data.append('check_out_lat', location.latitude.toString());
    data.append('check_out_long', location.longitude.toString());
    data.append('dateTime', dateTime);
    data.append('authorized', authorized);

    const apiUrl = 'http://123.231.60.24:1605/api/attendance/punch-out/';

    try {
      setLoading(true);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: data,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();
      setSelfieUri(null);
      return result;
    } catch (error) {
      Alert.alert('Failed to punch-in', error.message);
      setSelfieUri(null);
      navigation.navigate('Locationpo');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = async () => {
    if (punchedIn) {
      Alert.alert('Already punched in');
      return;
    }

    // If selfie is required but missing
    if (!selfieUri && !isDeviceVerified) {
      Alert.alert('Selfie Required', 'Please take a selfie before punching in.');
      return;
    }

    const result = await uploadSelfie();
    if (!result) return;

    setPunchedIn(true);

    Alert.alert('Punch In Successful', 'You have punched in successfully.', [
      {
        text: 'OK',
        onPress: () => navigation.navigate('Home'),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={{
          uri:
            'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0',
        }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Review & Confirm</Text>

          <Text style={styles.text}>
            Latitude: {location?.latitude ?? 'Not available'}
          </Text>
          <Text style={styles.text}>
            Longitude: {location?.longitude ?? 'Not available'}
          </Text>
          <Text style={styles.text}>
            Date & Time:{' '}
            {dateTime ? new Date(dateTime).toLocaleString() : 'Not available'}
          </Text>

          {selfieUri ? (
            <Image source={{ uri: selfieUri }} style={styles.selfie} />
          ) : isDeviceVerified ? (
            <Text style={styles.text}>Verified by Device</Text>
          ) : (
            <Text style={styles.text}>No selfie taken yet</Text>
          )}

          {loading && <ActivityIndicator size="large" color="#3498db" style={{ marginVertical: 20 }} />}

          <TouchableOpacity
            style={[styles.button, punchedIn || loading ? styles.buttonDisabled : null]}
            onPress={handlePunchIn}
            disabled={punchedIn || loading}
          >
            <Text style={styles.buttonText}>
              {punchedIn ? 'Punched In' : 'Submit Punch Out'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.9,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff',
    textAlign: 'center',
  },
  selfie: {
    width: 224,
    height: 224,
    borderRadius: 8,
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    elevation: 5,
    width: '80%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#7f8c8d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default PunchOutScreen;
