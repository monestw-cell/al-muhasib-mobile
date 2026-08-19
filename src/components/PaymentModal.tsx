import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency, shekelsToAgorot } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface PaymentModalProps {
  visible: boolean;
  totalCents: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  onClose: () => void;
  onConfirm: (paidCents: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  totalCents,
  paymentMethod,
  onClose,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const [paidInput, setPaidInput] = useState<string>((totalCents / 100).toString());

  const paidCents = paymentMethod === 'cash' ? shekelsToAgorot(paidInput) : totalCents;
  const changeCents = Math.max(0, paidCents - totalCents);

  const quickAmounts = [20, 50, 100, 200];

  const handleConfirm = () => {
    onConfirm(paidCents);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.onSurface }]}>
              {paymentMethod === 'cash' ? 'إتمام الدفع النقدي' : paymentMethod === 'card' ? 'إتمام الدفع بالبطاقة' : 'إتمام البيع الآجل'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Total Display */}
          <View style={[styles.totalBox, { backgroundColor: `${theme.primary}10` }]}>
            <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>المبلغ المطلوب</Text>
            <Text style={[styles.totalAmount, { color: theme.primary }]}>{formatCurrency(totalCents)}</Text>
          </View>

          {paymentMethod === 'cash' && (
            <>
              {/* Quick Amount Chips */}
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>اختر المبلغ المستلم:</Text>
              <View style={styles.quickGrid}>
                <TouchableOpacity
                  style={[styles.quickChip, { backgroundColor: theme.surfaceContainer }]}
                  onPress={() => setPaidInput((totalCents / 100).toString())}
                >
                  <Text style={[styles.quickChipText, { color: theme.onSurface }]}>المبلغ بالمضبوط</Text>
                </TouchableOpacity>

                {quickAmounts.map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.quickChip, { backgroundColor: theme.surfaceContainer }]}
                    onPress={() => setPaidInput(amt.toString())}
                  >
                    <Text style={[styles.quickChipText, { color: theme.onSurface }]}>{amt} ₪</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Paid Input */}
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>المبلغ المدفوع (₪):</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    color: theme.onSurface,
                    borderColor: theme.outlineVariant,
                  },
                ]}
                keyboardType="numeric"
                value={paidInput}
                onChangeText={setPaidInput}
              />

              {/* Change Output */}
              <View style={[styles.changeBox, { backgroundColor: theme.surfaceContainerLow }]}>
                <Text style={[styles.changeLabel, { color: theme.onSurfaceVariant }]}>المبلغ المتبقي للعميل (الفكة):</Text>
                <Text style={[styles.changeAmount, { color: theme.primary }]}>{formatCurrency(changeCents)}</Text>
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleConfirm}>
            <MaterialCommunityIcons name="check" size={22} color={theme.onPrimary} />
            <Text style={[styles.confirmBtnText, { color: theme.onPrimary }]}>تأكيد وطباعة الفاتورة</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  totalBox: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  quickGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  changeBox: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  changeLabel: {
    fontSize: 13,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  changeAmount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
