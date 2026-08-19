import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { ExpensesService, Expense } from '../services/expenses.service';
import { formatCurrency, shekelsToAgorot } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface ExpensesScreenProps {
  onBack?: () => void;
}

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('مصاريف تشغيلية');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const data = await ExpensesService.getAll();
    setExpenses(data);
  };

  const handleAddExpense = async () => {
    if (!title.trim() || !amount) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المصروف والمبلغ');
      return;
    }

    await ExpensesService.add({
      title: title.trim(),
      category: category.trim(),
      amount_cents: shekelsToAgorot(amount),
      payment_method: 'cash',
      note: note.trim(),
    });

    setTitle('');
    setAmount('');
    setNote('');
    setModalVisible(false);
    loadExpenses();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="إدارة المصاريف" showBack={!!onBack} onBackPress={onBack} />

      <FlatList
        data={expenses}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
            <View style={styles.rightInfo}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.tertiary}15` }]}>
                <MaterialCommunityIcons name="cash-minus" size={24} color={theme.tertiary} />
              </View>
              <View style={styles.details}>
                <Text style={[styles.titleText, { color: theme.onSurface }]}>{item.title}</Text>
                <Text style={[styles.catText, { color: theme.onSurfaceVariant }]}>{item.category} • {new Date(item.created_at).toLocaleDateString('ar-EG')}</Text>
              </View>
            </View>

            <Text style={[styles.amountText, { color: theme.error }]}>-{formatCurrency(item.amount_cents)}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.onPrimary} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>تسجيل مصروف جديد</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="بيان المصروف (مثال: أكياس بلاستيك) *"
              placeholderTextColor={theme.onSurfaceVariant}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="التصنيف"
              placeholderTextColor={theme.onSurfaceVariant}
              value={category}
              onChangeText={setCategory}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="المبلغ (₪) *"
              placeholderTextColor={theme.onSurfaceVariant}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="ملاحظات إضافية"
              placeholderTextColor={theme.onSurfaceVariant}
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.surfaceContainer }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: theme.onSurface }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleAddExpense}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>حفظ</Text>
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
  rightInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  details: { gap: 2 },
  titleText: { fontSize: 15, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  catText: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  amountText: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 16, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalInput: { height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
