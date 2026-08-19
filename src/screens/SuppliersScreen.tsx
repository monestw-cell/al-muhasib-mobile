import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { SuppliersService, Supplier } from '../services/suppliers.service';
import { formatCurrency, shekelsToAgorot } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface SuppliersScreenProps {
  onBack?: () => void;
}

export const SuppliersScreen: React.FC<SuppliersScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const loadSuppliers = async () => {
    const data = await SuppliersService.getAll(search);
    setSuppliers(data);
  };

  const handleOpenAddModal = () => {
    setEditingSupplierId(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setName(s.name);
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setModalVisible(true);
  };

  const handleSaveSupplier = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المورد');
      return;
    }
    if (editingSupplierId) {
      await SuppliersService.update(editingSupplierId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('تم بنجاح', 'تم تعديل بيانات المورد بنجاح');
    } else {
      await SuppliersService.add({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('تم بنجاح', 'تمت إضافة المورد بنجاح');
    }
    setModalVisible(false);
    loadSuppliers();
  };

  const handleDeleteSupplier = (s: Supplier) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف المورد (${s.name})؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف',
          style: 'destructive',
          onPress: async () => {
            await SuppliersService.delete(s.id);
            loadSuppliers();
            Alert.alert('تم بنجاح', 'تم حذف المورد');
          },
        },
      ]
    );
  };

  const handleRecordPayment = async () => {
    if (!selectedSupplier || !payAmount) return;
    const amountCents = shekelsToAgorot(payAmount);
    await SuppliersService.recordPayment(
      selectedSupplier.id,
      amountCents,
      'cash',
      'سداد دفعة للمورد',
      user?.id
    );
    setPayAmount('');
    setPayModalVisible(false);
    loadSuppliers();
    Alert.alert('تم بنجاح', 'تم تسجيل سند الصرف وتحديث رصيد الصندوق');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="الموردون والحسابات" showBack={!!onBack} onBackPress={onBack} />

      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.onSurfaceVariant} />
          <TextInput
            style={[styles.input, { color: theme.onSurface }]}
            placeholder="البحث باسم المورد أو رقم الهاتف..."
            placeholderTextColor={theme.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={suppliers}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={48} color={theme.outlineVariant} />
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>لا يوجد موردون مسجلون حالياً</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
            <View style={styles.rightInfo}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={24} color={theme.primary} />
              </View>
              <View style={styles.details}>
                <Text style={[styles.name, { color: theme.onSurface }]}>{item.name}</Text>
                <Text style={[styles.phone, { color: theme.onSurfaceVariant }]}>هاتف: {item.phone || 'بدون هاتف'}</Text>
                {item.address ? <Text style={[styles.address, { color: theme.onSurfaceVariant }]}>العنوان: {item.address}</Text> : null}
              </View>
            </View>

            <View style={styles.leftInfo}>
              <Text style={[styles.balanceLabel, { color: theme.onSurfaceVariant }]}>مستحقات المورد:</Text>
              <Text style={[styles.balanceAmount, { color: item.current_balance_cents > 0 ? theme.error : theme.primary }]}>
                {formatCurrency(item.current_balance_cents)}
              </Text>

              <View style={styles.actionBtnRow}>
                {item.current_balance_cents > 0 && (
                  <TouchableOpacity
                    style={[styles.payBtn, { backgroundColor: theme.primary }]}
                    onPress={() => {
                      setSelectedSupplier(item);
                      setPayModalVisible(true);
                    }}
                  >
                    <Text style={[styles.payBtnText, { color: theme.onPrimary }]}>سداد</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: `${theme.primary}15` }]}
                  onPress={() => handleOpenEditModal(item)}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: `${theme.error}15` }]}
                  onPress={() => handleDeleteSupplier(item)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={handleOpenAddModal}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.onPrimary} />
      </TouchableOpacity>

      {/* Add / Edit Supplier Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
                {editingSupplierId ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <Text style={[styles.fieldLabel, { color: theme.onSurfaceVariant }]}>اسم المورد أو الشركة *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="اسم المورد"
                placeholderTextColor={theme.onSurfaceVariant}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.fieldLabel, { color: theme.onSurfaceVariant }]}>رقم الهاتف</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="050-000-0000"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={[styles.fieldLabel, { color: theme.onSurfaceVariant }]}>العنوان</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="العنوان والمدينة"
                placeholderTextColor={theme.onSurfaceVariant}
                value={address}
                onChangeText={setAddress}
              />

              <Text style={[styles.fieldLabel, { color: theme.onSurfaceVariant }]}>ملاحظات</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="شروط الدفع أو ملاحظات إضافية"
                placeholderTextColor={theme.onSurfaceVariant}
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveSupplier}>
                <MaterialCommunityIcons name="check" size={20} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>
                  {editingSupplierId ? 'حفظ التعديلات' : 'حفظ المورد'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={payModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>سداد دفعة للمورد</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.suppInfo, { color: theme.onSurfaceVariant }]}>
              المورد: <Text style={{ color: theme.onSurface, fontWeight: 'bold' }}>{selectedSupplier?.name}</Text>
            </Text>
            <Text style={[styles.suppInfo, { color: theme.onSurfaceVariant }]}>
              المستحق الكلي: <Text style={{ color: theme.error, fontWeight: 'bold' }}>{formatCurrency(selectedSupplier?.current_balance_cents || 0)}</Text>
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant, marginTop: 10 }]}
              placeholder="المبلغ المدفوع (₪) *"
              placeholderTextColor={theme.onSurfaceVariant}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleRecordPayment}>
              <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>تسجيل سند الصرف</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: { padding: 12 },
  searchBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', fontSize: 13 },
  list: { padding: 12, paddingBottom: 80 },
  card: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rightInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  details: { gap: 2, flex: 1 },
  name: { fontSize: 14, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  phone: { fontSize: 12, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  address: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  leftInfo: { alignItems: 'flex-start', gap: 4 },
  balanceLabel: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic' },
  balanceAmount: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  actionBtnRow: { flexDirection: 'row-reverse', gap: 6, alignItems: 'center', marginTop: 4 },
  payBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  payBtnText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  miniBtn: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 20, left: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  fieldLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalInput: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, textAlign: 'right', fontSize: 13, fontFamily: 'IBM Plex Sans Arabic' },
  saveBtn: { height: 46, borderRadius: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, marginBottom: 20 },
  saveBtnText: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  suppInfo: { fontSize: 13, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginVertical: 2 },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'IBM Plex Sans Arabic' },
});
