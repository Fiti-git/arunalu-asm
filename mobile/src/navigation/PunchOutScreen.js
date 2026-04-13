import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, Alert,
  ActivityIndicator, ImageBackground, ScrollView, SafeAreaView,
} from 'react-native';
import { ENDPOINTS } from '../config';
import { apiFormPost } from '../api';

const BG_IMAGE = 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop';

const PunchOutScreen = ({ route, navigation }) => {
  const { location, dateTime, selfieUri: initialUri } = route.params || {};
  const [selfieUri, setSelfieUri] = useState(initialUri || '');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handlePunchOut = async () => {
    if (done) return;
    if (!location?.latitude || !location?.longitude) {
      Alert.alert('Location Error', 'Location data is missing.');
      return;
    }

    const form = new FormData();
    if (selfieUri) {
      const uri = selfieUri.startsWith('file://') ? selfieUri : `file://${selfieUri}`;
      form.append('photo_check_out', { uri, type: 'image/jpeg', name: 'selfie.jpg' });
    }
    form.append('check_out_lat', location.latitude.toString());
    form.append('check_out_long', location.longitude.toString());
    form.append('dateTime', dateTime);

    try {
      setLoading(true);
      await apiFormPost(ENDPOINTS.punchOut, form);
      setDone(true);
      setSelfieUri('');
      Alert.alert('Punch Out Successful', 'You have punched out successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (error) {
      setSelfieUri('');
      Alert.alert('Punch-out Failed', error.message);
      navigation.navigate('Locationpo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bg} imageStyle={{ opacity: 0.9 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Review & Confirm</Text>
          <Text style={styles.text}>Latitude: {location?.latitude ?? 'N/A'}</Text>
          <Text style={styles.text}>Longitude: {location?.longitude ?? 'N/A'}</Text>
          <Text style={styles.text}>Time: {dateTime ? new Date(dateTime).toLocaleString() : 'N/A'}</Text>

          {selfieUri
            ? <Image source={{ uri: selfieUri }} style={styles.selfie} />
            : <Text style={styles.text}>No selfie taken yet</Text>
          }

          {loading && <ActivityIndicator size="large" color="#3498db" style={{ marginVertical: 12 }} />}

          <TouchableOpacity
            style={[styles.button, (loading || done) && styles.buttonDisabled]}
            onPress={handlePunchOut}
            disabled={loading || done}
          >
            <Text style={styles.buttonText}>{done ? 'Punched Out' : 'Submit Punch Out'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 16, textTransform: 'uppercase' },
  text: { fontSize: 16, color: '#fff', marginBottom: 8, textAlign: 'center' },
  selfie: { width: 200, height: 200, borderRadius: 8, marginVertical: 16 },
  button: {
    backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 15,
    paddingHorizontal: 30, marginTop: 20, elevation: 5, width: '80%', alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#7f8c8d' },
  buttonText: { color: '#fff', fontSize: 18 },
});

export default PunchOutScreen;
