import React, { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, KeyboardAvoidingView, Modal,
  Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * Reusable slide-up bottom sheet.
 *
 * Props:
 *   visible   {boolean}
 *   onClose   {() => void}
 *   title     {string}
 *   children  {ReactNode}
 *   snapHeight {number}  — sheet height in pixels (default: 70% of screen)
 */
const BottomSheet = ({ visible, onClose, title, children, snapHeight }) => {
  const sheetH = snapHeight ?? SCREEN_H * 0.72;
  const translateY = useRef(new Animated.Value(sheetH)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: sheetH,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { height: sheetH, transform: [{ translateY }] }]}>
          {/* drag handle */}
          <View style={styles.handle} />

          {/* header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 0.3,
  },
  closeBtn: {
    fontSize: 18,
    color: '#999',
  },
});

export default BottomSheet;
