import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SelfieScreen = ({ route, navigation }) => {
  const { location, dateTime } = route.params;
  const [selfieUri, setSelfieUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    const checkAuthorization = async () => {
      const authorized = await AsyncStorage.getItem('authorized');
      if (authorized === 'true') {
        setIsAuthorized(true);
        navigation.replace('PunchIn', { location, dateTime, authorized: true });
      } else {
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs camera permission to take a selfie.',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      Alert.alert('Permission Error', err.message);
      return false;
    }
  };

  const handleTakeSelfie = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    setLoading(true);

    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'front',
        includeBase64: false,
      },
      async (response) => {
        const asset = response?.assets?.[0];
        if (!asset?.uri) {
          Alert.alert('Error', 'Failed to capture selfie.');
          setLoading(false);
          return;
        }

        try {
          const resizedImage = await ImageResizer.createResizedImage(
            asset.uri,
            224,
            224,
            'JPEG',
            100
          );
          setSelfieUri(resizedImage.uri);
          setLoading(false);
        } catch (error) {
          Alert.alert('Error', 'Could not resize image');
          setLoading(false);
        }
      }
    );
  };

  const handleNext = () => {
    if (!selfieUri && isAuthorized === false) {
      Alert.alert('Error', 'Please take a selfie before proceeding.');
      return;
    }

    navigation.navigate('PunchIn', {
      location,
      dateTime,
      authorized: true,
      selfieUri: isAuthorized ? undefined : selfieUri,
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.contentWrapper}>
            <Text style={styles.title}>Selfie & Punch Info</Text>
            <View style={styles.underline} />

            <Text style={styles.text}>
              Latitude: {location?.latitude ?? 'Not available'}
            </Text>
            <Text style={styles.text}>
              Longitude: {location?.longitude ?? 'Not available'}
            </Text>
            <Text style={styles.text}>
              Date & Time: {dateTime ? new Date(dateTime).toLocaleString() : 'Not available'}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#3498db" style={{ marginVertical: 20 }} />
            ) : (
              !isAuthorized && (
                <TouchableOpacity
                  style={styles.takeSelfieButton}
                  onPress={handleTakeSelfie}
                >
                  
                  <Text style={styles.buttonText}>Take Selfie</Text>
                </TouchableOpacity>
              )
            )}

            {selfieUri && (
              <Image source={{ uri: selfieUri }} style={styles.selfie} />
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              disabled={loading}
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
    opacity: 0.85,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  contentWrapper: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  underline: {
    width: '60%',
    height: 2,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  selfie: {
    width: 224,
    height: 224,
    borderRadius: 10,
    marginVertical: 16,
  },
  takeSelfieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    elevation: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0392b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    textTransform: 'uppercase',
    width: '80%',
    textAlign: 'center',
  },
});

export default SelfieScreen;
