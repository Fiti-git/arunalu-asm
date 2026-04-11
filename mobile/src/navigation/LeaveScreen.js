import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  ScrollView,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LeaveScreen = () => {
  const navigation = useNavigation();
  const [leaveHistoryData, setleaveHistoryData] = useState([]);
  const [remaingleave, setremaingleave] = useState([]);

  const fetchData = async (url, setData) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'You must be logged in.');
        return;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    }
  };

  useEffect(() => {
    fetchData('http://123.231.60.24:1605/api/attendance/myleaverequests/', setleaveHistoryData);
    fetchData('http://123.231.60.24:1605/api/attendance/pendingleave/', setremaingleave);
  }, []);

  const renderLeaveItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.leave_type}</Text>
      <Text style={styles.cell}>{item.remaining}</Text>
      <Text style={styles.cell}>{item.used}</Text>
    </View>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyRow}>
      <Text style={styles.cell}>{item.add_date || 'No Date'}</Text>
      <Text style={styles.cell}>{item.leave_type_name || 'No Leave Type'}</Text>
      <Text style={styles.cell}>{item.status || 'No Status'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>LEAVE</Text>
            <View style={styles.underline} />
          </View>

          {/* Available Leaves */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Available Leaves</Text>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell]}>Leave Type</Text>
              <Text style={[styles.cell, styles.headerCell]}>Remaining</Text>
              <Text style={[styles.cell, styles.headerCell]}>Used</Text>
            </View>

            {remaingleave.length > 0 ? (
              <FlatList
                data={remaingleave}
                keyExtractor={item => item.leave_code}
                renderItem={renderLeaveItem}
                scrollEnabled={false}
              />
            ) : (
              <Text>No available leave data</Text>
            )}
          </View>

          {/* Leave History */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Leave History</Text>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerCell]}>Date</Text>
              <Text style={[styles.cell, styles.headerCell]}>Leave Type</Text>
              <Text style={[styles.cell, styles.headerCell]}>Status</Text>
            </View>

            {leaveHistoryData.length > 0 ? (
              <FlatList
                data={leaveHistoryData}
                keyExtractor={item => item.leave_refno.toString()}
                renderItem={renderHistoryItem}
                scrollEnabled={false}
              />
            ) : (
              <Text>No leave history data</Text>
            )}
          </View>

          {/* Apply Leave Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ApplyLeave')}
          >
            <Text style={styles.buttonText}>Apply Leave</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  backgroundImageStyle: {
    opacity: 0.9,
  },
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  underline: {
    width: '50%',
    height: 2,
    backgroundColor: '#3498db',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    elevation: 5,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  headerRow: {
    backgroundColor: '#f0f0f0',
  },
  cell: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: 'bold',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    textTransform: 'uppercase',
  },
});

export default LeaveScreen;
