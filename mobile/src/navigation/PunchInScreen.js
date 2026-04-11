import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PunchInScreen = ({ route, navigation }) => {
  const { location, dateTime } = route.params;
  const [selfieUri, setSelfieUri] = useState(route.params?.selfieUri || '');
  const [loading, setLoading] = useState(false);
  const [punchedIn, setPunchedIn] = useState(false);
  const [errorShown, setErrorShown] = useState(false); // To prevent multiple alerts
  const [isDeviceVerified, setIsDeviceVerified] = useState(false); // For device verification status

  useEffect(() => {
    // Check if device verification status is stored in AsyncStorage
    const checkDeviceVerification = async () => {
      const authorized = await AsyncStorage.getItem('authorized');
      if (authorized === 'true') {
        setIsDeviceVerified(true); // Device is verified, no selfie needed
      }
    };

    checkDeviceVerification();
  }, []);

  const uploadSelfie = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const authorized = await AsyncStorage.getItem('authorized');

    const data = new FormData();

    // Add image to FormData
    if (selfieUri) {
      let uploadUri = selfieUri;
      if (!uploadUri.startsWith('file://')) {
        uploadUri = 'file://' + uploadUri;
      }

      data.append('photo_check_in', {
        uri: uploadUri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      });
    }

    // Add other data (location and time)
    data.append('check_in_lat', location.latitude.toString());
    data.append('check_in_long', location.longitude.toString());
    data.append('dateTime', dateTime);
    data.append('authorized', authorized);

    const apiUrl = 'http://123.231.60.24:1605/api/attendance/punch-in/';

    try {
      setLoading(true);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: data,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type here, as FormData will set it automatically
        },
      });

      console.log('data', data); // Log the FormData for debugging
      console.log('Response Status:', response.status); // Log the response status
      console.log('Respose Token:', token); // Log the token for debugging

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log('Punch-in Successful:', result);
      setSelfieUri(null);  // Reset image after successful punch-in
      return result;
    } catch (error) {
      Alert.alert('Failed to punch-in', error.message);
      setSelfieUri(null);  // Reset image in case of error
      navigation.navigate('Location'); // Navigate to the Location screen explicitly
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = async () => {
    if (punchedIn) {
      Alert.alert('Already punched in');
      return;
    }

    const result = await uploadSelfie();
    if (!result) return;

    setPunchedIn(true);

    Alert.alert(
      'Punch In Successful',
      `Response: ${JSON.stringify(result)}`,
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      }}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Review & Confirm</Text>

        <Text style={styles.text}>Latitude: {location.latitude}</Text>
        <Text style={styles.text}>Longitude: {location.longitude}</Text>
        <Text style={styles.text}>Date & Time: {new Date(dateTime).toLocaleString()}</Text>

        {/* Show "Verified by Device" message if no selfie is taken */}
        {selfieUri ? (
          <Image source={{ uri: selfieUri }} style={styles.selfie} />
        ) : isDeviceVerified ? (
          <Text style={styles.text}>Verified by Device</Text>
        ) : (
          <Text style={styles.text}>No selfie taken yet</Text>
        )}

        {loading && <ActivityIndicator size="large" color="#3498db" />}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#3498db' }]}
          onPress={handlePunchIn}
          disabled={loading || punchedIn}
        >
          <Text style={styles.buttonText}>
            {punchedIn ? 'Punched In' : 'Submit Punch In'}
          </Text>
        </TouchableOpacity>
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
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    padding: 20,
    width: '80%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff', // White text for better contrast on background
    marginBottom: 10,
    textTransform: 'uppercase', // Make the text all caps
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff', // White text for better readability
  },
  selfie: {
    width: 224,
    height: 224,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row', // Align icon and text horizontally
    alignItems: 'center', // Center vertically
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    elevation: 5,
    width: '80%', // Ensure the button width is consistent
    backgroundColor: '#3498db', // Consistent button color
    marginTop: 20, // Add space between content and button
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default PunchInScreen;
