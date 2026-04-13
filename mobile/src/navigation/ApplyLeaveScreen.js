import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Alert, ActivityIndicator,
  ImageBackground, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { ENDPOINTS } from '../config';
import { apiGet, apiPost } from '../api';

const BG_IMAGE = 'https://images.unsplash.com/photo-1600614550174-f85c0cbe6ee8?q=80&w=1972&auto=format&fit=crop';
const SPECIAL_LEAVE_ID = 4;

const ApplyLeaveScreen = () => {
  const navigation = useNavigation();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveType, setLeaveType] = useState(null);
  const [leaveLimits, setLeaveLimits] = useState({});
  const [selectedDates, setSelectedDates] = useState({});
  const [remarks, setRemarks] = useState('');
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet(ENDPOINTS.pendingLeave)
      .then(data => {
        const types = data.map(item => ({ id: item.id, label: item.leave_type, remaining: item.remaining }));
        setLeaveTypes(types);
        setLeaveLimits(types.reduce((acc, t) => ({ ...acc, [t.id]: t.remaining }), {}));
        if (types.length) setLeaveType(types[0].id);
      })
      .catch(() => Alert.alert('Error', 'Failed to load leave types.'))
      .finally(() => setFetching(false));
  }, []);

  const handleDateSelect = (dateString) => {
    setSelectedDates(prev => {
      if (prev[dateString]) {
        const next = { ...prev };
        delete next[dateString];
        return next;
      }
      const limit = leaveType === SPECIAL_LEAVE_ID ? Infinity : (leaveLimits[leaveType] ?? 0);
      if (Object.keys(prev).length >= limit) {
        Alert.alert('Limit Reached', `You can only select up to ${limit} day(s).`);
        return prev;
      }
      return { ...prev, [dateString]: { selected: true, marked: true } };
    });
  };

  const handleApply = async () => {
    if (!Object.keys(selectedDates).length)
      return Alert.alert('Validation', 'Please select at least one date.');
    if (leaveType === SPECIAL_LEAVE_ID && !remarks)
      return Alert.alert('Validation', 'Please provide a reason for Special Leave.');

    try {
      setLoading(true);
      await apiPost(ENDPOINTS.applyLeave, {
        leave_type: leaveType,
        leave_dates: Object.keys(selectedDates),
        remarks: leaveType === SPECIAL_LEAVE_ID ? remarks : '',
      });
      Alert.alert('Success', 'Leave application submitted!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
      setSelectedDates({});
      setRemarks('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bg} imageStyle={{ opacity: 0.9 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.card}>
              <Text style={styles.title}>Apply for Leave</Text>

              <Text style={styles.label}>Leave Type</Text>
              {fetching ? (
                <ActivityIndicator size="large" color="#3498db" />
              ) : (
                <Picker
                  selectedValue={leaveType}
                  onValueChange={(val) => { setLeaveType(val); setSelectedDates({}); setRemarks(''); }}
                  style={styles.picker}
                >
                  {leaveTypes.map(t => <Picker.Item key={t.id} label={`${t.label} (${t.remaining} left)`} value={t.id} />)}
                </Picker>
              )}

              <Text style={styles.label}>Select Date(s)</Text>
              <Calendar
                onDayPress={day => handleDateSelect(day.dateString)}
                markedDates={selectedDates}
                markingType="multi-dot"
                style={styles.calendar}
              />

              {leaveType === SPECIAL_LEAVE_ID && (
                <>
                  <Text style={styles.label}>Reason for Special Leave</Text>
                  <TextInput
                    style={styles.input}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Enter reason"
                    multiline
                  />
                </>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={loading}>
                <Text style={styles.submitBtnText}>
                  {loading ? 'Submitting…' : 'Submit Leave Application'}
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
  bg: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, alignItems: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)', padding: 20,
    borderRadius: 15, width: '100%', elevation: 5, marginTop: 40, marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', textTransform: 'uppercase' },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', color: '#444' },
  picker: { height: 50, width: '100%', marginBottom: 20 },
  calendar: { borderRadius: 10, borderWidth: 1, borderColor: '#ccc', marginBottom: 20, overflow: 'hidden' },
  input: {
    height: 80, borderColor: '#ccc', borderWidth: 1,
    marginBottom: 20, padding: 10, textAlignVertical: 'top', borderRadius: 6,
  },
  submitBtn: {
    backgroundColor: '#3498db', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center', marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
});

export default ApplyLeaveScreen;
