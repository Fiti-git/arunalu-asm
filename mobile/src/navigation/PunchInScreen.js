import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, ImageBackground } from 'react-native';
import { ENDPOINTS } from '../config';
import { apiFormPost } from '../api';

const BG_IMAGE = 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop';

const PunchInScreen = ({ route, navigation }) => {
  const { location, dateTime, selfieUri: initialUri } = route.params || {};
  const [selfieUri, setSelfieUri] = useState(initialUri || '');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handlePunchIn = async () => {
    if (done) return;

    const form = new FormData();
    if (selfieUri) {
      const uri = selfieUri.startsWith('file://') ? selfieUri : `file://${selfieUri}`;
      form.append('photo_check_in', { uri, type: 'image/jpeg', name: 'selfie.jpg' });
    }
    form.append('check_in_lat', location.latitude.toString());
    form.append('check_in_long', location.longitude.toString());
    form.append('dateTime', dateTime);

    try {
      setLoading(true);
      await apiFormPost(ENDPOINTS.punchIn, form);
      setDone(true);
      setSelfieUri('');
      Alert.alert('Punch In Successful', 'You have punched in successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (error) {
      setSelfieUri('');
      Alert.alert('Punch-in Failed', error.message);
      navigation.navigate('Location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bg} imageStyle={{ opacity: 0.9 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Review & Confirm</Text>
        <Text style={styles.text}>Latitude: {location?.latitude}</Text>
        <Text style={styles.text}>Longitude: {location?.longitude}</Text>
        <Text style={styles.text}>Time: {new Date(dateTime).toLocaleString()}</Text>

        {selfieUri
          ? <Image source={{ uri: selfieUri }} style={styles.selfie} />
          : <Text style={styles.text}>No selfie taken yet</Text>
        }

        {loading && <ActivityIndicator size="large" color="#3498db" style={{ marginVertical: 12 }} />}

        <TouchableOpacity
          style={[styles.button, (loading || done) && styles.buttonDisabled]}
          onPress={handlePunchIn}
          disabled={loading || done}
        >
          <Text style={styles.buttonText}>{done ? 'Punched In' : 'Submit Punch In'}</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, width: '80%' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 16, textTransform: 'uppercase' },
  text: { fontSize: 16, color: '#fff', marginBottom: 8, textAlign: 'center' },
  selfie: { width: 200, height: 200, borderRadius: 8, marginVertical: 16 },
  button: {
    backgroundColor: '#3498db', borderRadius: 10, padding: 15,
    alignItems: 'center', width: '80%', marginTop: 20, elevation: 5,
  },
  buttonDisabled: { backgroundColor: '#7f8c8d' },
  buttonText: { color: '#fff', fontSize: 18 },
});

export default PunchInScreen;
