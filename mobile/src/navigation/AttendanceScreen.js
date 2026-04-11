import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';

const AttendanceScreen = ({ navigation }) => {
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState(null);

  const handlePunchIn = () => {
    navigation.navigate('Location');
    setPunchedIn(true);
    setPunchTime(new Date().toLocaleTimeString());
  };

  const handlePunchOut = () => {
    setPunchedIn(false);
    setPunchTime(null);  // Reset punch-in time on punch-out
    navigation.navigate('Locationpo');  // Navigate to the "Location" screen
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
        {/* Title with blue line */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Attendance</Text>
          <View style={styles.underline} />
        </View>

        <Text style={styles.info}>
          {punchedIn ? `You are punched in since ${punchTime}` : 'Mark your attendance here.'}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: punchedIn ? '#95a5a6' : '#3498db' }]}
            onPress={handlePunchIn}
            disabled={punchedIn} // Disable Punch In if already punched in
          >
            <Text style={styles.buttonText}>{punchedIn ? 'Punched In' : 'Punch In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#c0392b' }]}
            onPress={handlePunchOut}
          >
            <Text style={styles.buttonText}>Punch Out</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    opacity: 0.8, // Slightly lower opacity for better readability
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  titleContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 300,
    marginTop: 15,
  },
  title: {
    fontSize: 25,
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
  info: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
    color: '#fff',
    textTransform: 'uppercase',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    elevation: 5,
    width: '45%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    marginLeft: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
});

export default AttendanceScreen;
