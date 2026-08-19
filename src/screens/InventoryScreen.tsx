import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { InventoryService, StockMovement } from '../services/inventory.service';
import { ProductsService, Product } from '../services/products.service';
import { formatCurrency } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface InventoryScreenProps {
  onBack?: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);

  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('جرد وتسوية يدوية');

  useEffect(() => {
    loadData();
  }, [selectedProductId]);

  const loadData = async () => {
    const movs = await InventoryService.getMovements(selectedProductId);
    setMovements(movs);
    const prods = await ProductsService.getAll();
    setProducts(prods);
  };

  const handleApplyAdjustment = async () => {
    if (!adjustProduct || !adjustQty) {
      Alert.alert('تنبيه', 'يرجى اختيار المنتج وتحديد الكمية');
      return;
    }

    const qtyNumber = parseInt(adjustQty, 10);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال كمية صحيحة');
      return;
    }

    const change = adjustType === 'add' ? qtyNumber : -qtyNumber;

    try {
      await InventoryService.adjustStock(adjustProduct.id, change, adjustReason, user?.id);
      setAdjustModalVisible(false);
      setAdjustQty('');
      setAdjustProduct(null);
      loadData();
      Alert.alert('نجاح', 'تمت تسوية رصيد المخزون بنجاح');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشلت عملية التسوية');
    }
  };

  const getMovementTypeName = (type: string) => {
    switch (type) {
      case 'sale': return 'مبيعات (خروج)';
      case 'purchase': return 'مشتريات (دخول)';
      case 'manual_adjustment': return 'تسوية جردية';
      case 'initial': return 'رصيد افتتاحي';
      default: return type;
    }
  };

  const totalValuation = products.reduce((sum, p) => sum + p.cost_price_cents * p.stock_quantity, 0);
  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_quantity).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="حركة وتسوية المخزون" showBack={!!onBack} onBackPress={onBack} />

      {/* KPI Cards Header */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
          <Text style={[styles.kpiLabel, { color: theme.onSurfaceVariant }]}>قيمة المخزون (بالتكلفة)</Text>
          <Text style={[styles.kpiValue, { color: theme.primary }]}>{formatCurrency(totalValuation)}</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
          <Text style={[styles.kpiLabel, { color: theme.onSurfaceVariant }]}>نواقص المخزون</Text>
          <Text style={[styles.kpiValue, { color: lowStockCount > 0 ? theme.error : theme.primary }]}>
            {lowStockCount} منتج
          </Text>
        </View>
      </View>

      {/* Product Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedProductId === undefined
                ? { backgroundColor: theme.primary }
                : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
            ]}
            onPress={() => setSelectedProductId(undefined)}
          >
            <Text style={[styles.filterChipText, { color: selectedProductId === undefined ? theme.onPrimary : theme.onSurface }]}>
              جميع الحركات
            </Text>
          </TouchableOpacity>

          {products.map(p => {
            const isSelected = selectedProductId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.filterChip,
                  isSelected
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                ]}
                onPress={() => setSelectedProductId(p.id)}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? theme.onPrimary : theme.onSurface }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stock Movements List */}
      <FlatList
        data={movements}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="swap-horizontal" size={48} color={theme.outlineVariant} />
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>لا توجد حركات مخزون مسجلة</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPositive = item.quantity_change > 0;
          return (
            <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
              <View style={styles.rightInfo}>
                <View style={[styles.iconBox, { backgroundColor: isPositive ? `${theme.primary}15` : `${theme.error}15` }]}>
                  <MaterialCommunityIcons
                    name={isPositive ? 'arrow-down-bold' : 'arrow-up-bold'}
                    size={20}
                    color={isPositive ? theme.primary : theme.error}
                  />
                </View>
                <View style={styles.details}>
                  <Text style={[styles.name, { color: theme.onSurface }]}>{item.product_name || 'منتج'}</Text>
                  <Text style={[styles.typeText, { color: theme.onSurfaceVariant }]}>
                    {getMovementTypeName(item.movement_type)} • {new Date(item.created_at).toLocaleString('ar-EG')}
                  </Text>
                  {item.note ? <Text style={[styles.noteText, { color: theme.onSurfaceVariant }]}>{item.note}</Text> : null}
                </View>
              </View>

              <View style={styles.leftInfo}>
                <Text style={[styles.qtyChange, { color: isPositive ? theme.primary : theme.error }]}>
                  {isPositive ? '+' : ''}{item.quantity_change}
                </Text>
                <Text style={[styles.balanceAfter, { color: theme.onSurfaceVariant }]}>
                  الرصيد بعدها: {item.balance_after}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {
          if (products.length > 0) setAdjustProduct(products[0]);
          setAdjustModalVisible(true);
        }}
      >
        <MaterialCommunityIcons name="tune-variant" size={28} color={theme.onPrimary} />
      </TouchableOpacity>

      {/* Manual Stock Adjustment Modal */}
      <Modal visible={adjustModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>تسوية جردية للمخزون</Text>
              <TouchableOpacity onPress={() => setAdjustModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>اختر المنتج المراد تسويته *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                {products.map(p => {
                  const isSelected = adjustProduct?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.chip,
                        isSelected
                          ? { backgroundColor: theme.primary }
                          : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                      ]}
                      onPress={() => setAdjustProduct(p)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? theme.onPrimary : theme.onSurface }]}>
                        {p.name} ({p.stock_quantity})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>نوع الحركة</Text>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    adjustType === 'add'
                      ? { backgroundColor: theme.primary }
                      : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                  ]}
                  onPress={() => setAdjustType('add')}
                >
                  <Text style={{ color: adjustType === 'add' ? theme.onPrimary : theme.onSurface, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' }}>
                    + إضافة للمخزون (فائض/زيادة)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    adjustType === 'deduct'
                      ? { backgroundColor: theme.error }
                      : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                  ]}
                  onPress={() => setAdjustType('deduct')}
                >
                  <Text style={{ color: adjustType === 'deduct' ? theme.onError : theme.onSurface, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' }}>
                    - خصم من المخزون (عجز/تالف)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>الكمية المراد تسويتها *</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="أدخل عدد الحبات..."
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="numeric"
                value={adjustQty}
                onChangeText={setAdjustQty}
              />

              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>سبب التسوية</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="مثال: جرد سنوي، تالف أثناء النقل..."
                placeholderTextColor={theme.onSurfaceVariant}
                value={adjustReason}
                onChangeText={setAdjustReason}
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleApplyAdjustment}>
                <MaterialCommunityIcons name="check" size={22} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>تطبيق التسوية على المخزون</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  kpiRow: { flexDirection: 'row-reverse', gap: 10, padding: 12, paddingBottom: 4 },
  kpiCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 },
  kpiLabel: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  kpiValue: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  filterSection: { paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginLeft: 8 },
  filterChipText: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
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
  rightInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  details: { gap: 2, flex: 1 },
  name: { fontSize: 14, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  typeText: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  noteText: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  leftInfo: { alignItems: 'flex-start', gap: 2 },
  qtyChange: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  balanceAfter: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'IBM Plex Sans Arabic' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  label: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginLeft: 8 },
  chipText: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  typeBtn: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputBox: { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, textAlign: 'right', fontSize: 14, fontFamily: 'IBM Plex Sans Arabic' },
  saveBtn: { height: 48, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 20 },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
});
