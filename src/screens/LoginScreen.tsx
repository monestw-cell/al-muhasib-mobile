import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../theme/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    const success = await login(username, password);
    setIsLoading(false);

    if (!success) {
      Alert.alert('خطأ في الدخول', 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.card}>
        <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
          <MaterialCommunityIcons name="store" size={48} color="#ffffff" />
        </View>

        <Text style={[styles.title, { color: theme.onSurface }]}>المحاسب الحنيوك</Text>
        <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>نظام المحاسبة والبيع المتكامل للمحلات</Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>اسم المستخدم:</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
            <MaterialCommunityIcons name="account-outline" size={20} color={theme.onSurfaceVariant} />
            <TextInput
              style={[styles.input, { color: theme.onSurface }]}
              placeholder="أدخل اسم المستخدم"
              placeholderTextColor={theme.onSurfaceVariant}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>كلمة المرور:</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={theme.onSurfaceVariant} />
            <TextInput
              style={[styles.input, { color: theme.onSurface }]}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor={theme.onSurfaceVariant}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={[styles.loginBtnText, { color: theme.onPrimary }]}>
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Text>
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.onPrimary} />
          </TouchableOpacity>
        </View>

        {/* Demo Creds Hint */}
        <View style={[styles.demoBox, { backgroundColor: theme.surfaceContainerHigh }]}>
          <Text style={[styles.demoTitle, { color: theme.onSurface }]}>حسابات للتجربة:</Text>
          <Text style={[styles.demoText, { color: theme.onSurfaceVariant }]}>مدير: admin / 123456</Text>
          <Text style={[styles.demoText, { color: theme.onSurfaceVariant }]}>كاشير: cashier / 123456</Text>
        </View>

        {/* Developer Signature */}
        <View style={styles.devFooter}>
          <MaterialCommunityIcons name="code-braces" size={16} color={theme.primary} />
          <Text style={[styles.devFooterText, { color: theme.onSurfaceVariant }]}>
            تطوير وبرمجة المطور: <Text style={{ color: theme.primary, fontWeight: 'bold' }}>مؤنس الطويل</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  inputContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: 15,
    textAlign: 'right',
  },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    elevation: 3,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  demoBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'flex-start',
    gap: 2,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  demoText: {
    fontSize: 12,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  devFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  devFooterText: {
    fontSize: 12,
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
