import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const APP_LOCK_ENABLED_KEY = 'hanyouk_app_lock_enabled';
const APP_LOCK_TYPE_KEY = 'hanyouk_app_lock_type';
const APP_LOCK_PIN_KEY = 'hanyouk_app_lock_pin';

export const AppLockService = {
  isLockEnabled: async (): Promise<boolean> => {
    try {
      const val = await SecureStore.getItemAsync(APP_LOCK_ENABLED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  getLockType: async (): Promise<'biometric' | 'pin'> => {
    try {
      const type = await SecureStore.getItemAsync(APP_LOCK_TYPE_KEY);
      return (type as 'biometric' | 'pin') || 'biometric';
    } catch {
      return 'biometric';
    }
  },

  setLock: async (enabled: boolean, lockType: 'biometric' | 'pin' = 'biometric', pin?: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(APP_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
      await SecureStore.setItemAsync(APP_LOCK_TYPE_KEY, lockType);
      if (pin) {
        await SecureStore.setItemAsync(APP_LOCK_PIN_KEY, pin);
      }
    } catch (err) {
      console.error('Failed to set lock:', err);
    }
  },

  isBiometricsSupported: async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  },

  authenticateBiometrics: async (): Promise<boolean> => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تأكيد الهوية لفتح المحاسب الحنيوك',
        fallbackLabel: 'استخدام رمز PIN',
        cancelLabel: 'إلغاء',
        disableDeviceFallback: false,
      });
      return res.success;
    } catch {
      return false;
    }
  },

  verifyPin: async (inputPin: string): Promise<boolean> => {
    try {
      const savedPin = await SecureStore.getItemAsync(APP_LOCK_PIN_KEY);
      if (!savedPin) {
        // Fallback to default PIN '1234' or admin password
        return inputPin === '1234';
      }
      return savedPin === inputPin;
    } catch {
      return false;
    }
  },
};
