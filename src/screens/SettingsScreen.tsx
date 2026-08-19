import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Alert, Image, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Header } from '../components/Header';
import { SettingsService, ShopInfo } from '../services/settings.service';
import { BackupService } from '../services/backup.service';
import { AppLockService } from '../services/app-lock.service';
import { AuthService } from '../services/auth.service';
import { verifyPassword } from '../utils/security';
import { queryFirst } from '../db/database';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface SettingsScreenProps {
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { mode, theme, toggleTheme } = useTheme();
  const { user } = useAuthStore();

  const [storeName, setStoreName] = useState('متجري');
  const [phone, setPhone] = useState('050-000-0000');
  const [address, setAddress] = useState('الشارع الرئيسي');
  const [taxNumber, setTaxNumber] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('شكراً لزيارتكم!');
  const [pdfThemeColor, setPdfThemeColor] = useState('#00685f');
  const [showSignature, setShowSignature] = useState(true);
  const [signatureTitle, setSignatureTitle] = useState('توقيع وختم المحل');

  // App Lock States
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockType, setLockType] = useState<'biometric' | 'pin'>('biometric');
  const [pinCode, setPinCode] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);

  // Wipe Data Password Modal State
  const [wipeModalVisible, setWipeModalVisible] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [wipeError, setWipeError] = useState('');

  const colorOptions = ['#00685f', '#1e3a8a', '#7c3aed', '#b45309', '#0f172a', '#be123c', '#047857'];

  useEffect(() => {
    loadShopInfo();
    loadLockSettings();
  }, []);

  const loadShopInfo = async () => {
    const info = await SettingsService.getShopInfo();
    if (info) {
      setStoreName(info.store_name || '');
      setPhone(info.phone || '');
      setAddress(info.address || '');
      setTaxNumber(info.tax_number || '');
      setCrNumber(info.cr_number || '');
      setLogoPath(info.logo_path || '');
      setReceiptFooter(info.receipt_footer || 'شكراً لزيارتكم وصحتين وعافية!');
      setPdfThemeColor(info.pdf_theme_color || '#00685f');
      setShowSignature(info.show_signature !== 0);
      setSignatureTitle(info.signature_title || 'توقيع وختم المحل');
    }
  };

  const loadLockSettings = async () => {
    const isLocked = await AppLockService.isLockEnabled();
    setLockEnabled(isLocked);
    const type = await AppLockService.getLockType();
    setLockType(type);
    const bioSupported = await AppLockService.isBiometricsSupported();
    setHasBiometrics(bioSupported);
  };

  const handleToggleLock = async (val: boolean) => {
    setLockEnabled(val);
    await AppLockService.setLock(val, lockType, pinCode || '1234');
    Alert.alert('الأمان', val ? 'تم تفعيل قفل التطبيق بنجاح' : 'تم تعطيل قفل التطبيق');
  };

  const handleSavePin = async () => {
    if (!pinCode || pinCode.length < 4) {
      Alert.alert('تنبيه', 'يجب أن يتكون رمز PIN من 4 أرقام على الأقل');
      return;
    }
    await AppLockService.setLock(true, 'pin', pinCode);
    setLockEnabled(true);
    setLockType('pin');
    Alert.alert('تم بنجاح', 'تم حفظ رمز PIN وتفعيل قفل التطبيق');
  };

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'يرجى منح صلاحية الوصول للصور لاختيار الشعار.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setLogoPath(res.assets[0].uri);
    }
  };

  const handleSaveShopInfo = async () => {
    await SettingsService.updateShopInfo({
      store_name: storeName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      tax_number: taxNumber.trim(),
      cr_number: crNumber.trim(),
      logo_path: logoPath,
      receipt_footer: receiptFooter.trim(),
      pdf_theme_color: pdfThemeColor,
      show_signature: showSignature ? 1 : 0,
      signature_title: signatureTitle.trim(),
    });
    Alert.alert('تم الحفظ', 'تم حفظ وتحديث إعدادات المتجر وهوية الـ PDF بنجاح.');
  };

  const handleConfirmWipe = async () => {
    if (!wipePassword.trim()) {
      setWipeError('يرجى كتابة كلمة المرور للتأكيد');
      return;
    }

    try {
      // Verify password against current user or admin user
      const currentUser = await queryFirst<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?',
        [user?.id || 1]
      );

      let isMatch = false;
      if (currentUser) {
        isMatch = await verifyPassword(wipePassword.trim(), currentUser.password_hash);
      }
      
      // Also allow admin standard password '123456' as emergency fallback
      if (!isMatch && wipePassword.trim() === '123456') {
        isMatch = true;
      }

      if (!isMatch) {
        setWipeError('كلمة المرور غير صحيحة! تم رفض عملية التصفير.');
        return;
      }

      await SettingsService.wipeAllDatabaseData();
      const { AccountsService } = require('../services/accounts.service');
      await AccountsService.initDefaultAccounts();

      setWipeModalVisible(false);
      setWipePassword('');
      setWipeError('');
      Alert.alert(
        'تم التصفير الكامل بنجاح',
        'تم مسح وتصفير كافة البيانات، الفواتير، الحركات، والقيود المحاسبية بنجاح وأصبح النظام نظيفاً 100%.'
      );
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشلت عملية التصفير');
    }
  };

  const handleBackup = async () => {
    const path = await BackupService.createBackup();
    if (path) {
      Alert.alert('تم إنشاء النسخة الاحتياطية', 'تم حفظ ومشاركة ملف قاعدة البيانات بنجاح.');
    } else {
      Alert.alert('خطأ', 'فشل إنشاء النسخة الاحتياطية.');
    }
  };

  const handleRestore = async () => {
    Alert.alert('تأكيد الاستعادة', 'استعادة نسخة احتياطية ستقوم باستبدال قاعدة البيانات الحالية بكل بياناتها. هل تود الاستمرار؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'استعادة',
        style: 'destructive',
        onPress: async () => {
          const success = await BackupService.restoreBackup();
          if (success) {
            Alert.alert('تمت الاستعادة', 'تمت استعادة قاعدة البيانات بنجاح.');
            loadShopInfo();
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="الإعدادات والأمان وهوية PDF" showBack={!!onBack} onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Appearance Settings */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>المظهر والثيم</Text>
        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <MaterialCommunityIcons name="theme-light-dark" size={22} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.onSurface }]}>الوضع الداكن (Dark Mode)</Text>
            </View>
            <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>
        </View>

        {/* App Lock & Security Settings */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>أمان وقفل التطبيق</Text>
        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <MaterialCommunityIcons name="shield-lock-outline" size={22} color={theme.primary} />
              <View>
                <Text style={[styles.cardTitle, { color: theme.onSurface }]}>قفل التطبيق للأمان</Text>
                <Text style={{ fontSize: 11, color: theme.onSurfaceVariant, fontFamily: 'IBM Plex Sans Arabic' }}>
                  طلب البصمة أو رمز PIN عند فتح التطبيق
                </Text>
              </View>
            </View>
            <Switch value={lockEnabled} onValueChange={handleToggleLock} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>

          {lockEnabled && (
            <View style={{ gap: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: theme.outlineVariant, paddingTop: 10 }}>
              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>طريقة القفل المفضلة:</Text>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                {hasBiometrics && (
                  <TouchableOpacity
                    style={[
                      styles.methodOption,
                      lockType === 'biometric'
                        ? { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }
                        : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
                    ]}
                    onPress={async () => {
                      setLockType('biometric');
                      await AppLockService.setLock(true, 'biometric');
                    }}
                  >
                    <MaterialCommunityIcons name="fingerprint" size={20} color={lockType === 'biometric' ? theme.primary : theme.onSurfaceVariant} />
                    <Text style={[styles.methodOptionText, { color: lockType === 'biometric' ? theme.primary : theme.onSurface }]}>
                      البصمة / قفل الهاتف
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    lockType === 'pin'
                      ? { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }
                      : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
                  ]}
                  onPress={async () => {
                    setLockType('pin');
                    await AppLockService.setLock(true, 'pin', pinCode || '1234');
                  }}
                >
                  <MaterialCommunityIcons name="numeric" size={20} color={lockType === 'pin' ? theme.primary : theme.onSurfaceVariant} />
                  <Text style={[styles.methodOptionText, { color: lockType === 'pin' ? theme.primary : theme.onSurface }]}>
                    رمز PIN للتطبيق
                  </Text>
                </TouchableOpacity>
              </View>

              {lockType === 'pin' && (
                <View style={{ gap: 6, marginTop: 4 }}>
                  <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>تعيين رمز PIN (4-6 أرقام):</Text>
                  <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                      placeholder="أدخل 4 أو 6 أرقام"
                      placeholderTextColor={theme.onSurfaceVariant}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={6}
                      value={pinCode}
                      onChangeText={setPinCode}
                    />
                    <TouchableOpacity style={[styles.pinBtn, { backgroundColor: theme.primary }]} onPress={handleSavePin}>
                      <Text style={[styles.pinBtnText, { color: theme.onPrimary }]}>حفظ PIN</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Shop Info & PDF Identity */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>بيانات المتجر وهوية الـ PDF</Text>
        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
          {/* Logo Picker */}
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>شعار المتجر (يظهر أعلى الفاتورة)</Text>
          <View style={styles.logoSection}>
            {logoPath ? (
              <Image source={{ uri: logoPath }} style={styles.logoPreview} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
                <MaterialCommunityIcons name="image-plus" size={28} color={theme.onSurfaceVariant} />
                <Text style={{ fontSize: 10, color: theme.onSurfaceVariant, fontFamily: 'IBM Plex Sans Arabic' }}>بدون شعار</Text>
              </View>
            )}

            <View style={{ flex: 1, gap: 6 }}>
              <TouchableOpacity style={[styles.logoBtn, { backgroundColor: theme.surfaceContainer }]} onPress={handlePickLogo}>
                <MaterialCommunityIcons name="image-edit-outline" size={18} color={theme.primary} />
                <Text style={[styles.logoBtnText, { color: theme.primary }]}>اختيار صورة الشعار</Text>
              </TouchableOpacity>
              {logoPath ? (
                <TouchableOpacity onPress={() => setLogoPath('')}>
                  <Text style={{ fontSize: 11, color: theme.error, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' }}>إزالة الشعار</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Theme Color for PDF */}
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>لون ثيم الفواتير والتقارير PDF</Text>
          <View style={styles.colorPaletteRow}>
            {colorOptions.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  pdfThemeColor === c && { borderWidth: 3, borderColor: theme.onSurface },
                ]}
                onPress={() => setPdfThemeColor(c)}
              >
                {pdfThemeColor === c && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>اسم المتجر / الشركة</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
            value={storeName}
            onChangeText={setStoreName}
          />

          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>رقم الهاتف للتواصل</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>العنوان</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
            value={address}
            onChangeText={setAddress}
          />

          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>الرقم الضريبي (اختياري)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
            placeholder="مثال: 300123456700003"
            placeholderTextColor={theme.onSurfaceVariant}
            value={taxNumber}
            onChangeText={setTaxNumber}
          />

          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>السجل التجاري (اختياري)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
            placeholder="مثال: 1010203040"
            placeholderTextColor={theme.onSurfaceVariant}
            value={crNumber}
            onChangeText={setCrNumber}
          />

          <View style={styles.signatureRow}>
            <Text style={[styles.cardTitle, { color: theme.onSurface }]}>خانة التوقيع والختم في الـ PDF</Text>
            <Switch value={showSignature} onValueChange={setShowSignature} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>

          {showSignature && (
            <>
              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>عنوان خانة التوقيع</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                value={signatureTitle}
                onChangeText={setSignatureTitle}
              />
            </>
          )}

          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>تذييل الفاتورة والـ PDF</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
            value={receiptFooter}
            onChangeText={setReceiptFooter}
          />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveShopInfo}>
            <MaterialCommunityIcons name="content-save-outline" size={20} color={theme.onPrimary} />
            <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>حفظ إعدادات المتجر والـ PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Database Clean & Reset Section */}
        <Text style={[styles.sectionTitle, { color: theme.error }]}>إدارة وتصفير البيانات (محمي بكلمة السر)</Text>
        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: `${theme.error}40` }]}>
          <Text style={{ fontSize: 12, color: theme.onSurfaceVariant, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginBottom: 8 }}>
            إذا كنت تريد البدء من الصفر ومسح كل فواتير المبيعات والمشتريات وحركات المخزون والقيود المحاسبية، اضغط على الزر أدناه:
          </Text>

          <TouchableOpacity
            style={[styles.actionRowBtn, { backgroundColor: `${theme.error}15`, borderColor: theme.error, borderWidth: 1 }]}
            onPress={() => {
              setWipePassword('');
              setWipeError('');
              setWipeModalVisible(true);
            }}
          >
            <MaterialCommunityIcons name="database-remove-outline" size={22} color={theme.error} />
            <Text style={[styles.actionRowText, { color: theme.error, fontWeight: 'bold' }]}>
              تصفير ومسح كامل الحركات والبدء من الصفر
            </Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Restore */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>النسخ الاحتياطي</Text>
        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
          <TouchableOpacity style={[styles.actionRowBtn, { backgroundColor: theme.surfaceContainer }]} onPress={handleBackup}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={22} color={theme.primary} />
            <Text style={[styles.actionRowText, { color: theme.onSurface }]}>إنشاء نسخة احتياطية (Export Backup)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRowBtn, { backgroundColor: theme.surfaceContainer }]} onPress={handleRestore}>
            <MaterialCommunityIcons name="cloud-download-outline" size={22} color={theme.error} />
            <Text style={[styles.actionRowText, { color: theme.error }]}>استعادة نسخة احتياطية (Restore Backup)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Confirmation Modal for Wipe */}
      <Modal visible={wipeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.error }]}>تأكيد مسح وتصفير كافة البيانات</Text>
              <TouchableOpacity onPress={() => setWipeModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: theme.onSurface, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginVertical: 6 }}>
              هذا الإجراء سيقوم بمسح كافة الفواتير وحسابات المبيعات والمشتريات والقيود والديون والمخزون نهائياً.
            </Text>

            <Text style={[styles.label, { color: theme.onSurfaceVariant, marginTop: 8 }]}>
              أدخل كلمة المرور الحالية لتأكيد التصفير:
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="كلمة مرور حسابك"
              placeholderTextColor={theme.onSurfaceVariant}
              secureTextEntry
              value={wipePassword}
              onChangeText={txt => {
                setWipePassword(txt);
                setWipeError('');
              }}
            />

            {wipeError ? (
              <Text style={{ color: theme.error, fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' }}>
                {wipeError}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.wipeConfirmBtn, { backgroundColor: theme.error }]}
                onPress={handleConfirmWipe}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
                <Text style={styles.wipeConfirmBtnText}>تأكيد ومسح الكل</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.wipeCancelBtn, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}
                onPress={() => setWipeModalVisible(false)}
              >
                <Text style={[styles.wipeCancelBtnText, { color: theme.onSurface }]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 80 },
  sectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  switchRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  switchLabelGroup: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  label: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginTop: 4 },
  input: { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 13, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  methodOption: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  methodOptionText: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  pinBtn: { height: 46, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pinBtnText: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  logoSection: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginVertical: 4 },
  logoPreview: { width: 70, height: 70, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  logoPlaceholder: { width: 70, height: 70, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  logoBtn: { height: 38, borderRadius: 8, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  logoBtnText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  colorPaletteRow: { flexDirection: 'row-reverse', gap: 12, marginVertical: 6 },
  colorCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  signatureRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  saveBtn: { height: 48, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  actionRowBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  actionRowText: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 20, padding: 20, gap: 10 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  wipeConfirmBtn: { flex: 1, height: 46, borderRadius: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  wipeConfirmBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  wipeCancelBtn: { width: 90, height: 46, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wipeCancelBtnText: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
});
