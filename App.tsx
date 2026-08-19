import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, AppState, AppStateStatus } from 'react-native';
import { DatabaseService } from './src/services/database.service';
import { useAuthStore } from './src/store/useAuthStore';
import { ThemeProvider } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppLockService } from './src/services/app-lock.service';
import { AppLockModal } from './src/components/AppLockModal';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const { checkSession } = useAuthStore();

  useEffect(() => {
    initApp();

    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const enabled = await AppLockService.isLockEnabled();
        if (enabled) {
          setIsAppLocked(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const initApp = async () => {
    try {
      await DatabaseService.initialize();
      await checkSession();
      const lockEnabled = await AppLockService.isLockEnabled();
      if (lockEnabled) {
        setIsAppLocked(true);
      }
      setIsDbReady(true);
    } catch (err) {
      console.error('App init error:', err);
      setIsDbReady(true);
    }
  };

  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00685f" />
        <Text style={styles.loadingText}>جاري تهيئة قاعدة البيانات والتطبيقات...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <RootNavigator />
      {isAppLocked && (
        <AppLockModal
          visible={isAppLocked}
          onUnlocked={() => setIsAppLocked(false)}
        />
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5faf8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#00685f',
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
