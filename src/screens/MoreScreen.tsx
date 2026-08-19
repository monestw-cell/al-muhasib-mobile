import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Image, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Header } from '../components/Header';
import { useAuthStore } from '../store/useAuthStore';
import { UsersService } from '../services/users.service';
import { useTheme } from '../theme/ThemeContext';

interface MoreScreenProps {
  onNavigate: (tab: string) => void;
  onBack?: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({ onNavigate, onBack }) => {
  const { theme, mode, toggleTheme } = useTheme();
  const { user, logout, updateAvatar } = useAuthStore();

  const handlePickAvatar = async () => {
    Alert.alert('تغيير الصورة الشخصية', 'اختر طريقة رفع الصورة:', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'الكاميرا',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('تنبيه', 'يجب منح إذن استخدام الكاميرا لالتقاط صورة.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!res.canceled && res.assets[0]?.uri && user) {
            const uri = res.assets[0].uri;
            await UsersService.updateAvatar(user.id, uri);
            await updateAvatar(uri);
            Alert.alert('تم بنجاح', 'تم تحديث صورتك الشخصية!');
          }
        },
      },
      {
        text: 'معرض الصور',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('تنبيه', 'يجب منح إذن الوصول للصور.');
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!res.canceled && res.assets[0]?.uri && user) {
            const uri = res.assets[0].uri;
            await UsersService.updateAvatar(user.id, uri);
            await updateAvatar(uri);
            Alert.alert('تم بنجاح', 'تم تحديث صورتك الشخصية!');
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت تأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const menuItems = [
    { key: 'sales', label: 'سجل فواتير المبيعات', icon: 'receipt', desc: 'عرض وحذف وطباعة فواتير المبيعات وتصدير PDF' },
    { key: 'accounts', label: 'دليل وشجرة الحسابات العامة', icon: 'file-tree-outline', desc: 'إدارة شجرة الحسابات، ميزان المراجعة، ودفتر الأستاذ' },
    { key: 'suppliers', label: 'الموردون والحسابات', icon: 'truck-delivery-outline', desc: 'إدارة حسابات الموردين، الأرصدة وسندات الصرف' },
    { key: 'purchases', label: 'فواتير الشراء والبضاعة', icon: 'clipboard-text-outline', desc: 'إنشاء وعرض فواتير شراء البضاعة وتحديث التكلفة' },
    { key: 'inventory', label: 'حركة وتسوية المخزون', icon: 'swap-horizontal', desc: 'سجل حركات الدخول والخروج والتسوية اليدوية' },
    { key: 'cash', label: 'الصندوق والورديات', icon: 'cash-register', desc: 'إدارة نقدية الدرج، الورديات، والإيداع/السحب' },
    { key: 'expenses', label: 'إدارة المصاريف', icon: 'cash-minus', desc: 'تسجيل وتصنيف مصاريف المحل والتشغيل' },
    { key: 'customers', label: 'العملاء والديون', icon: 'account-group-outline', desc: 'إدارة ديون العملاء وسقف الائتمان وسندات القبض' },
    { key: 'settings', label: 'الإعدادات وهوية PDF', icon: 'cog-outline', desc: 'بيانات المتجر، الشعار، تخصيص PDF، وتصفير البيانات' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="المزيد من الخيارات" showBack={!!onBack} onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card with Avatar Picker */}
        <View style={[styles.userCard, { backgroundColor: theme.primaryContainer }]}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarTouchable}>
            {user?.avatar_path ? (
              <Image source={{ uri: user.avatar_path }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'م'}</Text>
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
              <MaterialCommunityIcons name="camera" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.onPrimaryContainer }]}>{user?.full_name}</Text>
            <Text style={[styles.userRole, { color: theme.onPrimaryContainer }]}>
              الدور: {user?.role === 'admin' ? 'مدير النظام' : user?.role === 'cashier' ? 'كاشير' : user?.role === 'accountant' ? 'محاسب' : 'مشرف'}
            </Text>
            <TouchableOpacity onPress={handlePickAvatar}>
              <Text style={[styles.changePhotoText, { color: theme.primaryFixed }]}>تغيير الصورة الشخصية</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Dark Mode Card */}
        <View style={[styles.themeRow, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
          <View style={styles.themeRight}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="theme-light-dark" size={22} color={theme.primary} />
            </View>
            <View>
              <Text style={[styles.menuTitle, { color: theme.onSurface }]}>الوضع الداكن (Dark Mode)</Text>
              <Text style={[styles.menuDesc, { color: theme.onSurfaceVariant }]}>
                {mode === 'dark' ? 'مفعل الآن' : 'غير مفعل'}
              </Text>
            </View>
          </View>
          <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: theme.primary }} />
        </View>

        {/* Menu Items */}
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.menuRow, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}
            onPress={() => onNavigate(item.key)}
          >
            <View style={styles.rightGroup}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: theme.onSurface }]}>{item.label}</Text>
                <Text style={[styles.menuDesc, { color: theme.onSurfaceVariant }]}>{item.desc}</Text>
              </View>
            </View>

            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        ))}

        {/* Developer Card & Signature */}
        <View style={[styles.developerCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: `${theme.primary}40` }]}>
          <View style={[styles.devAvatarBox, { backgroundColor: `${theme.primary}15` }]}>
            <MaterialCommunityIcons name="shield-crown-outline" size={26} color={theme.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.devTitle, { color: theme.onSurface }]}>تطوير وبرمجة النظام</Text>
            <Text style={[styles.devName, { color: theme.primary }]}>مؤنس الطويل</Text>
            <Text style={[styles.devVersion, { color: theme.onSurfaceVariant }]}>الإصدار 1.1.0 • المحاسب الحنيوك برو</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: `${theme.error}15` }]} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 80 },
  userCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 4,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  userInfo: { gap: 2, flex: 1, alignItems: 'flex-start' },
  userName: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  userRole: { fontSize: 12, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  changePhotoText: { fontSize: 11, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textDecorationLine: 'underline', marginTop: 2 },
  themeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  themeRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  menuRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rightGroup: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  menuDesc: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  logoutBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  logoutText: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  developerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
  },
  devAvatarBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
  devName: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
  devVersion: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
});
