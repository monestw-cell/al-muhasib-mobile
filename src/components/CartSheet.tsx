import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface CartSheetProps {
  visible: boolean;
  onClose: () => void;
  onPayPress: (method: 'cash' | 'card' | 'credit') => void;
}

export const CartSheet: React.FC<CartSheetProps> = ({ visible, onClose, onPayPress }) => {
  const { theme } = useTheme();
  const { items, customer, updateQuantity, removeItem, clearCart, getSubtotal, getTotal } = useCartStore();

  const subtotal = getSubtotal();
  const total = getTotal();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[styles.sheet, { backgroundColor: theme.surface }]} activeOpacity={1}>
          {/* Drag Handle & Header */}
          <View style={styles.header}>
            <View style={[styles.handle, { backgroundColor: theme.outlineVariant }]} />
            <View style={styles.headerRow}>
              <Text style={[styles.sheetTitle, { color: theme.onSurface }]}>تفاصيل السلة</Text>
              <TouchableOpacity onPress={clearCart}>
                <Text style={[styles.clearBtn, { color: theme.error }]}>إفراغ السلة</Text>
              </TouchableOpacity>
            </View>

            {customer && (
              <View style={[styles.customerBadge, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialCommunityIcons name="account" size={16} color={theme.primary} />
                <Text style={[styles.customerName, { color: theme.primary }]}>{customer.name}</Text>
              </View>
            )}
          </View>

          {/* Items List */}
          <FlatList
            data={items}
            keyExtractor={item => item.product_id.toString()}
            style={styles.itemsList}
            renderItem={({ item }) => (
              <View style={[styles.itemCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.onSurface }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemPrice, { color: theme.primary }]}>
                    {formatCurrency(item.unit_price_cents)}
                  </Text>
                </View>

                <View style={styles.itemActions}>
                  <View style={[styles.qtyRow, { backgroundColor: theme.surfaceContainer }]}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
                    >
                      <MaterialCommunityIcons
                        name={item.quantity === 1 ? 'delete-outline' : 'minus'}
                        size={18}
                        color={item.quantity === 1 ? theme.error : theme.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: theme.onSurface }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={async () => {
                        const { ProductsService } = require('../services/products.service');
                        const prod = await ProductsService.getById(item.product_id);
                        if (prod) {
                          const success = updateQuantity(item.product_id, item.quantity + 1, prod.stock_quantity);
                          if (!success) {
                            const { Alert } = require('react-native');
                            Alert.alert('تنبيه المخزون', `الكمية المتوفرة من (${prod.name}) في المخزن هي (${prod.stock_quantity}) فقط!`);
                          }
                        } else {
                          updateQuantity(item.product_id, item.quantity + 1);
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="plus" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.lineTotal, { color: theme.onSurface }]}>
                    {formatCurrency(item.unit_price_cents * item.quantity)}
                  </Text>
                </View>
              </View>
            )}
          />

          {/* Sheet Footer */}
          <View style={[styles.footer, { backgroundColor: theme.surfaceContainerLow, borderTopColor: theme.surfaceVariant }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.onSurfaceVariant }]}>المجموع الفرعي</Text>
              <Text style={[styles.rowValue, { color: theme.onSurface }]}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.onSurfaceVariant }]}>الضريبة (0%)</Text>
              <Text style={[styles.rowValue, { color: theme.onSurface }]}>0.00 ₪</Text>
            </View>

            <View style={[styles.totalRow, { borderTopColor: theme.surfaceVariant }]}>
              <Text style={[styles.totalLabel, { color: theme.onSurface }]}>الإجمالي المطلوب</Text>
              <Text style={[styles.totalValue, { color: theme.primary }]}>{formatCurrency(total)}</Text>
            </View>

            {/* Payment Options */}
            <View style={styles.payGrid}>
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant }]}
                onPress={() => onPayPress('card')}
              >
                <MaterialCommunityIcons name="credit-card-outline" size={20} color={theme.onSurface} />
                <Text style={[styles.payBtnText, { color: theme.onSurface }]}>دفع شبكة</Text>
              </TouchableOpacity>

              {customer && customer.id !== 1 && (
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: theme.tertiaryContainer }]}
                  onPress={() => onPayPress('credit')}
                >
                  <MaterialCommunityIcons name="clock-outline" size={20} color={theme.onTertiaryContainer} />
                  <Text style={[styles.payBtnText, { color: theme.onTertiaryContainer }]}>بيع آجل</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.payBtnPrimary, { backgroundColor: theme.primary }]}
                onPress={() => onPayPress('cash')}
              >
                <MaterialCommunityIcons name="cash" size={22} color={theme.onPrimary} />
                <Text style={[styles.payBtnPrimaryText, { color: theme.onPrimary }]}>دفع نقدي</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    marginBottom: 8,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  clearBtn: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  customerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  customerName: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  itemsList: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  itemCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  itemPrice: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  itemActions: {
    alignItems: 'flex-start',
    gap: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    height: 32,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    width: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 13,
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  payGrid: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  payBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  payBtnPrimary: {
    flex: 1.5,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
