import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Vibration, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppLockService } from '../services/app-lock.service';
import { useTheme } from '../theme/ThemeContext';

interface AppLockModalProps {
  visible: boolean;
  onUnlocked: () => void;
}

export const AppLockModal: React.FC<AppLockModalProps> = ({ visible, onUnlocked }) => {
  const { theme } = useTheme();
  const [pin, setPin] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMessage('');
      checkAndTriggerBiometrics();
    }
  }, [visible]);

  const checkAndTriggerBiometrics = async () => {
    const supported = await AppLockService.isBiometricsSupported();
    setHasBiometrics(supported);
    if (supported) {
      const success = await AppLockService.authenticateBiometrics();
      if (success) {
        onUnlocked();
      }
    }
  };

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMessage('');

    if (newPin.length >= 4) {
      const isValid = await AppLockService.verifyPin(newPin);
      if (isValid) {
        setPin('');
        onUnlocked();
      } else if (newPin.length === 6) {
        Vibration.vibrate(200);
        setErrorMessage('رمز PIN غير صحيح');
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}15` }]}>
            <MaterialCommunityIcons name="shield-lock" size={42} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.onSurface }]}>المحاسب الحنيوك</Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
            التطبيق مقفل للأمان. يرجى تأكيد البصمة أو إدخال رمز PIN
          </Text>
        </View>

        {/* PIN Dots */}
        <View style={styles.pinDotsRow}>
          {[0, 1, 2, 3].map(idx => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  borderColor: theme.primary,
                  backgroundColor: pin.length > idx ? theme.primary : 'transparent',
                },
              ]}
            />
          ))}
        </View>

        {errorMessage ? (
          <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>
        ) : null}

        {/* Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            [hasBiometrics ? 'bio' : '', '0', 'del'],
          ].map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keypadRow}>
              {row.map((btn, colIdx) => {
                if (btn === 'bio') {
                  return (
                    <TouchableOpacity
                      key={colIdx}
                      style={[styles.keyBtn, styles.specialKey, { backgroundColor: `${theme.primary}10` }]}
                      onPress={checkAndTriggerBiometrics}
                    >
                      <MaterialCommunityIcons name="fingerprint" size={28} color={theme.primary} />
                    </TouchableOpacity>
                  );
                }
                if (btn === 'del') {
                  return (
                    <TouchableOpacity
                      key={colIdx}
                      style={[styles.keyBtn, styles.specialKey, { backgroundColor: theme.surfaceContainerLow }]}
                      onPress={handleDelete}
                    >
                      <MaterialCommunityIcons name="backspace-outline" size={24} color={theme.onSurfaceVariant} />
                    </TouchableOpacity>
                  );
                }
                if (btn === '') {
                  return <View key={colIdx} style={[styles.keyBtn, styles.invisibleKey]} />;
                }
                return (
                  <TouchableOpacity
                    key={colIdx}
                    style={[styles.keyBtn, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
                    onPress={() => handleKeyPress(btn)}
                  >
                    <Text style={[styles.keyNumber, { color: theme.onSurface }]}>{btn}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Developer Signature */}
        <View style={styles.devFooter}>
          <Text style={[styles.devFooterText, { color: theme.onSurfaceVariant }]}>
            تطوير وبرمجة المطور: <Text style={{ color: theme.primary, fontWeight: 'bold' }}>مؤنس الطويل</Text>
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'IBM Plex Sans Arabic',
    maxWidth: 280,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    gap: 14,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  keyBtn: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  specialKey: {
    borderWidth: 0,
  },
  invisibleKey: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  devFooter: {
    marginTop: 8,
    alignItems: 'center',
  },
  devFooterText: {
    fontSize: 12,
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
