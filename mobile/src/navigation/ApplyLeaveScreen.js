import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const ApplyLeaveScreen = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveType, setLeaveType] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLeaveTypes, setFetchingLeaveTypes] = useState(true);
  const [selectedDates, setSelectedDates] = useState({});
  const [leaveLimits, setLeaveLimits] = useState({});
  const navigation = useNavigation();

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      let retryCount = 0;
      const maxRetries = 3;

      const tryFetch = async () => {
        try {
          const token = await AsyncStorage.getItem('accessToken');
          if (!token) return Alert.alert('Error', 'You must be logged in.');

          const response = await fetch('http://123.231.60.24:1605/api/attendance/pendingleave/', {
            headers: { 'Authorization': 'Bearer ' + token },
          });

          if (!response.ok) throw new Error('Failed to fetch leave types');
          const data = await response.json();

          const mapped = data.map(item => ({
            id: item.id,
            label: item.leave_type,
            remaining: item.remaining,
            used: item.used,
          }));

          setLeaveTypes(mapped);
          setLeaveLimits(mapped.reduce((acc, type) => {
            acc[type.id] = type.remaining;
            return acc;
          }, {}));

          setLeaveType(mapped[0]?.id);
          setFetchingLeaveTypes(false);
        } catch (error) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(tryFetch, 1000);
          } else {
            console.error(error);
            Alert.alert('Error', 'Failed to load leave types. Please try again.');
            setFetchingLeaveTypes(false);
          }
        }
      };

      tryFetch();
    };

    fetchLeaveTypes();
  }, []);

  const handleDateSelect = (date) => {
    const count = Object.keys(selectedDates).length;
    if (leaveType !== 4) {
      if (selectedDates[date]) {
        const updated = { ...selectedDates };
        delete updated[date];
        setSelectedDates(updated);
      } else {
        const limit = leaveLimits[leaveType];
        if (count < limit) {
          setSelectedDates({ ...selectedDates, [date]: { selected: true, marked: true } });
        } else {
          alert(`You can only select up to ${limit} days.`);
        }
      }
    } else {
      const updated = { ...selectedDates };
      if (updated[date]) {
        delete updated[date];
      } else {
        updated[date] = { selected: true, marked: true };
      }
      setSelectedDates(updated);
    }
  };

  const handleApplyLeave = async () => {
    if (!Object.keys(selectedDates).length)
      return Alert.alert('Validation', 'Please select at least one date.');

    if (leaveType === 4 && !remarks)
      return Alert.alert('Validation', 'Please provide a reason for Special Leave.');

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return Alert.alert('Error', 'You must be logged in.');

    const payload = {
      leave_type: leaveType,
      leave_dates: Object.keys(selectedDates),
      remarks: leaveType === 4 ? remarks : '',
    };

    try {
      setLoading(true);
      const response = await fetch('http://123.231.60.24:1605/api/attendance/applyleave/', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        return alert(`Error: ${error.message}`);
      }

      Alert.alert('Success', 'Leave application submitted!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);

      setSelectedDates({});
      setRemarks('');
    } catch (error) {
      alert('Failed to connect. Try again later.');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={styles.title}>Apply for Leave</Text>

              <Text style={styles.label}>Select Leave Type</Text>
              {fetchingLeaveTypes ? (
                <ActivityIndicator size="large" color="#0000ff" />
              ) : (
                <Picker
                  selectedValue={leaveType}
                  onValueChange={(itemValue) => {
                    setLeaveType(itemValue);
                    setSelectedDates({});
                    setRemarks('');
                  }}
                  style={styles.picker}
                >
                  {leaveTypes.map((type) => (
                    <Picker.Item key={type.id} label={type.label} value={type.id} />
                  ))}
                </Picker>
              )}

              <Text style={styles.label}>Select Date(s)</Text>
              <Calendar
                onDayPress={(day) => handleDateSelect(day.dateString)}
                markedDates={selectedDates}
                markingType="multi-dot"
                style={styles.calendarContainer}
              />

              {leaveType === 4 && (
                <>
                  <Text style={styles.label}>Reason for Special Leave</Text>
                  <TextInput
                    style={styles.input}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Enter reason for leave"
                    multiline
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleApplyLeave}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Submitting...' : 'Submit Leave Application'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    elevation: 5,
    marginBottom: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
    color: 'black',
  },
  input: {
    height: 80,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 20,
    padding: 10,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  calendarContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 20,
    overflow: 'hidden',
  },
});

export default ApplyLeaveScreen;
