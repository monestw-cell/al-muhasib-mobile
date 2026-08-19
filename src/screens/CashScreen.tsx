import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { CashService, Shift, CashMovement } from '../services/cash.service';
import { formatCurrency, shekelsToAgorot } from '../utils/currency';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../theme/ThemeContext';

interface CashScreenProps {
  onBack?: () => void;
}

export const CashScreen: React.FC<CashScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);

  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [movementModalVisible, setMovementModalVisible] = useState(false);

  const [actualCash, setActualCash] = useState('');
  const [movementType, setMovementType] = useState<'deposit' | 'withdraw'>('deposit');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const shift = await CashService.getActiveShift();
    setActiveShift(shift);

    const movs = await CashService.getMovements();
    setMovements(movs);
  };

  const handleOpenShift = async () => {
    if (!user) return;
    await CashService.openShift(user.id, 50000); // 500 ₪ opening cash
    loadData();
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    const actualCents = shekelsToAgorot(actualCash || '0');
    await CashService.closeShift(activeShift.id, actualCents);
    setCloseModalVisible(false);
    setActualCash('');
    loadData();
  };

  const handleAddMovement = async () => {
    if (!movementAmount || !movementReason) {
      Alert.alert('تنبيه', 'يرجى إدخال المبلغ والسبب');
      return;
    }
    await CashService.addCashMovement(
      movementType,
      shekelsToAgorot(movementAmount),
      movementReason,
      user?.id
    );
    setMovementModalVisible(false);
    setMovementAmount('');
    setMovementReason('');
    loadData();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="إدارة الصندوق والحسابات" showBack={!!onBack} onBackPress={onBack} />

      <View style={styles.content}>
        {/* Active Shift Card */}
        <View style={[styles.shiftCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
          <View style={styles.shiftHeader}>
            <Text style={[styles.shiftTitle, { color: theme.onSurface }]}>ورديّة الصندوق الحالية</Text>
            <View style={[styles.statusBadge, { backgroundColor: activeShift ? `${theme.primary}20` : `${theme.error}20` }]}>
              <Text style={[styles.statusText, { color: activeShift ? theme.primary : theme.error }]}>
                {activeShift ? 'مفتوحة' : 'مغلقة'}
              </Text>
            </View>
          </View>

          {activeShift ? (
            <View style={styles.shiftBody}>
              <View style={styles.shiftRow}>
                <Text style={[styles.shiftLabel, { color: theme.onSurfaceVariant }]}>رصيد الافتتاح:</Text>
                <Text style={[styles.shiftValue, { color: theme.onSurface }]}>{formatCurrency(activeShift.opening_balance_cents)}</Text>
              </View>
              <View style={styles.shiftRow}>
                <Text style={[styles.shiftLabel, { color: theme.onSurfaceVariant }]}>النقد المتوقع في الدرج:</Text>
                <Text style={[styles.shiftValue, { color: activeShift.expected_cash_cents < 0 ? theme.error : theme.primary, fontWeight: 'bold' }]}>
                  {formatCurrency(activeShift.expected_cash_cents)}
                  {activeShift.expected_cash_cents < 0 ? ' (رصيد بالسالب)' : ''}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => setMovementModalVisible(true)}>
                  <Text style={[styles.actionBtnText, { color: theme.onPrimary }]}>إيداع / سحب نقد</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.error }]} onPress={() => setCloseModalVisible(true)}>
                  <Text style={[styles.actionBtnText, { color: theme.onError }]}>إغلاق الوردية</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.openShiftBox}>
              <Text style={{ color: theme.onSurfaceVariant, fontSize: 13, textAlign: 'center' }}>لا توجد وردية مفتوحة حالياً.</Text>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 8 }]} onPress={handleOpenShift}>
                <Text style={[styles.actionBtnText, { color: theme.onPrimary }]}>فتح وردية جديدة (500 ₪ افتتاحي)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>سجل حركة الصندوق الأخيرة</Text>

        <FlatList
          data={movements}
          keyExtractor={item => item.id.toString()}
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <View style={[styles.movCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
              <View style={styles.rightInfo}>
                <View style={[styles.iconBox, { backgroundColor: item.amount_cents > 0 ? `${theme.primary}15` : `${theme.error}15` }]}>
                  <MaterialCommunityIcons
                    name={item.amount_cents > 0 ? 'arrow-down-left' : 'arrow-up-right'}
                    size={20}
                    color={item.amount_cents > 0 ? theme.primary : theme.error}
                  />
                </View>
                <View>
                  <Text style={[styles.movReason, { color: theme.onSurface }]}>{item.reason}</Text>
                  <Text style={[styles.movDate, { color: theme.onSurfaceVariant }]}>{new Date(item.created_at).toLocaleString('ar-EG')}</Text>
                </View>
              </View>

              <Text style={[styles.movAmount, { color: item.amount_cents > 0 ? theme.primary : theme.error }]}>
                {item.amount_cents > 0 ? '+' : ''}{formatCurrency(item.amount_cents)}
              </Text>
            </View>
          )}
        />
      </View>

      {/* Close Shift Modal */}
      <Modal visible={closeModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>إغلاق الوردية والحساب</Text>
            <Text style={{ color: theme.onSurfaceVariant, fontSize: 13 }}>
              المبلغ المتوقع بالنظام: {formatCurrency(activeShift?.expected_cash_cents || 0)}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="المبلغ الفعلي في الدرج (₪) *"
              keyboardType="numeric"
              value={actualCash}
              onChangeText={setActualCash}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.surfaceContainer }]} onPress={() => setCloseModalVisible(false)}>
                <Text style={{ color: theme.onSurface }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.error }]} onPress={handleCloseShift}>
                <Text style={{ color: theme.onError, fontWeight: 'bold' }}>تأكيد الإغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Movement Modal */}
      <Modal visible={movementModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>تسجيل حركة نقدية في الدرج</Text>

            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <TouchableOpacity
                style={[styles.btn, movementType === 'deposit' ? { backgroundColor: theme.primary } : { backgroundColor: theme.surfaceContainer }]}
                onPress={() => setMovementType('deposit')}
              >
                <Text style={{ color: movementType === 'deposit' ? theme.onPrimary : theme.onSurface }}>إيداع (إدخال)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, movementType === 'withdraw' ? { backgroundColor: theme.error } : { backgroundColor: theme.surfaceContainer }]}
                onPress={() => setMovementType('withdraw')}
              >
                <Text style={{ color: movementType === 'withdraw' ? theme.onError : theme.onSurface }}>سحب (إخراج)</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="المبلغ (₪) *"
              keyboardType="numeric"
              value={movementAmount}
              onChangeText={setMovementAmount}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
              placeholder="السبب (مثال: سداد مصروف أو توريد)"
              value={movementReason}
              onChangeText={setMovementReason}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.surfaceContainer }]} onPress={() => setMovementModalVisible(false)}>
                <Text style={{ color: theme.onSurface }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={handleAddMovement}>
                <Text style={{ color: theme.onPrimary, fontWeight: 'bold' }}>تأكيد الحركة</Text>
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
  content: { flex: 1, padding: 16, gap: 12 },
  shiftCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  shiftHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  shiftTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  shiftBody: { gap: 8 },
  shiftRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  shiftLabel: { fontSize: 13, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  shiftValue: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  actionRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic' },
  openShiftBox: { paddingVertical: 12, alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', marginTop: 8, textAlign: 'right' },
  movCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  rightInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  movReason: { fontSize: 14, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  movDate: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  movAmount: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 16, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalInput: { height: 48, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  modalBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
