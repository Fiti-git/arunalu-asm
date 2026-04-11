import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Alert,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const LocationScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'App needs access to your location for punch-in.',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        getCurrentLocation();
      } else {
        setErrorMsg('Location permission denied');
      }
    } catch (err) {
      setErrorMsg('Permission error: ' + err);
    }
  };

  const getCurrentLocation = () => {
    setLoadingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
        setDateTime(new Date());
        setLoadingLocation(false);
      },
      (error) => {
        setErrorMsg('Location error: ' + error.message);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleNext = () => {
    if (!location) {
      Alert.alert('Error', 'Location not available.');
      return;
    }
    navigation.navigate('Selfiepo', {
      location,
      dateTime: dateTime.toString(),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0',
        }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.innerContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Location</Text>
              <View style={styles.underline} />
            </View>

            {errorMsg ? (
              <Text style={styles.error}>{errorMsg}</Text>
            ) : loadingLocation ? (
              <ActivityIndicator size="large" color="#3498db" />
            ) : location ? (
              <View style={styles.locationInfo}>
                <Text style={styles.text}>Latitude: {location.latitude}</Text>
                <Text style={styles.text}>Longitude: {location.longitude}</Text>
                <Text style={styles.text}>Date & Time: {dateTime.toLocaleString()}</Text>
              </View>
            ) : (
              <Text style={styles.text}>Fetching location...</Text>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleNext}
              disabled={loadingLocation}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  innerContainer: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 15,
    padding: 20,
  },
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  underline: {
    width: 80,
    height: 2,
    backgroundColor: '#3498db',
    marginTop: 5,
  },
  text: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  error: {
    fontSize: 16,
    color: 'red',
    marginBottom: 15,
  },
  locationInfo: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'center',
    width: '100%',
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default LocationScreen;
