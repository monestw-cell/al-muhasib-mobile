import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { CustomersService, Customer } from '../services/customers.service';
import { formatCurrency, shekelsToAgorot } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface CustomersScreenProps {
  onBack?: () => void;
}

export const CustomersScreen: React.FC<CustomersScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('2000');
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    const data = await CustomersService.getAll(search);
    setCustomers(data);
  };

  const handleAddCustomer = async () => {
    if (!name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العميل');
      return;
    }
    await CustomersService.add({
      name: name.trim(),
      phone: phone.trim(),
      credit_limit_cents: shekelsToAgorot(creditLimit || '0'),
    });
    setName('');
    setPhone('');
    setAddModalVisible(false);
    loadCustomers();
  };

  const handleRecordPayment = async () => {
    if (!selectedCust || !payAmount) return;
    const amountCents = shekelsToAgorot(payAmount);
    await CustomersService.recordPayment(selectedCust.id, amountCents, 'cash', 'تحصيل دين');
    setPayAmount('');
    setPayModalVisible(false);
    loadCustomers();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="ديون والعملاء" showBack={!!onBack} onBackPress={onBack} />

      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.onSurfaceVariant} />
          <TextInput
            style={[styles.input, { color: theme.onSurface }]}
            placeholder="البحث باسم العميل أو رقم الهاتف..."
            placeholderTextColor={theme.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={customers}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
            <View style={styles.rightInfo}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialCommunityIcons name="account-outline" size={24} color={theme.primary} />
              </View>
              <View style={styles.details}>
                <Text style={[styles.name, { color: theme.onSurface }]}>{item.name}</Text>
                <Text style={[styles.phone, { color: theme.onSurfaceVariant }]}>{item.phone || 'بدون هاتف'}</Text>
              </View>
            </View>

            <View style={styles.leftInfo}>
              <Text style={[styles.balanceLabel, { color: theme.onSurfaceVariant }]}>الذمة المالية:</Text>
              <Text style={[styles.balanceAmount, { color: item.current_balance_cents > 0 ? theme.error : theme.primary }]}>
                {formatCurrency(item.current_balance_cents)}
              </Text>

              {item.current_balance_cents > 0 && (
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setSelectedCust(item);
                    setPayModalVisible(true);
                  }}
                >
                  <Text style={[styles.payBtnText, { color: theme.onPrimary }]}>تحصيل</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setAddModalVisible(true)}>
        <MaterialCommunityIcons name="account-plus-outline" size={28} color={theme.onPrimary} />
      </TouchableOpacity>

      {/* Add Customer Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>إضافة عميل جديد</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="اسم العميل *"
              placeholderTextColor={theme.onSurfaceVariant}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="رقم الهاتف"
              placeholderTextColor={theme.onSurfaceVariant}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="سقف الائتمان (₪)"
              placeholderTextColor={theme.onSurfaceVariant}
              keyboardType="numeric"
              value={creditLimit}
              onChangeText={setCreditLimit}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.surfaceContainer }]} onPress={() => setAddModalVisible(false)}>
                <Text style={{ color: theme.onSurface }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleAddCustomer}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={payModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>تحصيل مبلغ من {selectedCust?.name}</Text>
            <Text style={{ color: theme.onSurfaceVariant, fontSize: 13 }}>
              المبلغ المستحق: {formatCurrency(selectedCust?.current_balance_cents || 0)}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="المبلغ المستلم (₪)"
              placeholderTextColor={theme.onSurfaceVariant}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.surfaceContainer }]} onPress={() => setPayModalVisible(false)}>
                <Text style={{ color: theme.onSurface }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleRecordPayment}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>تأكيد التحصيل</Text>
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
  searchSection: { padding: 12 },
  searchBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  card: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rightInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  details: { gap: 2 },
  name: { fontSize: 15, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  phone: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  leftInfo: { alignItems: 'flex-start', gap: 2 },
  balanceLabel: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic' },
  balanceAmount: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  payBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  payBtnText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 16, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalInput: { height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
