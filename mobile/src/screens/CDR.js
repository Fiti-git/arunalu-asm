import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CDRScreen = () => {
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const forceAlternateFlow = async () => {
      try {
        await AsyncStorage.setItem('alternate', 'true');
        navigation.navigate('Home'); // Navigate after setting
      } catch (error) {
        console.error('Error setting AsyncStorage:', error);
        Alert.alert('Error', 'Failed to set device status.');
      } finally {
        setLoading(false);
      }
    };

    forceAlternateFlow();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Device Validation</Text>
      {loading && <ActivityIndicator size="large" color="#1976d2" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 40,
  },
});

export default CDRScreen;