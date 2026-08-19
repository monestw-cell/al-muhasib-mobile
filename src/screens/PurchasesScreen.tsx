import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { PurchasesService, PurchaseRecord, PurchaseItemInput } from '../services/purchases.service';
import { SuppliersService, Supplier } from '../services/suppliers.service';
import { ProductsService, Product } from '../services/products.service';
import { PdfExportService } from '../services/pdf-export.service';
import { formatCurrency, shekelsToAgorot, agorotToShekels } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface PurchasesScreenProps {
  onBack?: () => void;
}

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year';

export const PurchasesScreen: React.FC<PurchasesScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'remaining'>('all');

  // Create / Edit Modal State
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);
  const [customPurchaseNum, setCustomPurchaseNum] = useState('');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);

  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [customPurchaseDate, setCustomPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<{ product: Product; quantity: number; unitCost: string }[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');

  // Autocomplete Live Search State
  const [productQuery, setProductQuery] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);

  // Quick Add Supplier Sub-Modal State
  const [quickSupplierModal, setQuickSupplierModal] = useState(false);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPhone, setNewSuppPhone] = useState('');
  const [newSuppAddress, setNewSuppAddress] = useState('');
  const [newSuppNotes, setNewSuppNotes] = useState('');

  // Quick Add Product Sub-Modal State
  const [quickProductModal, setQuickProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('حبة');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdSale, setNewProdSale] = useState('');

  useEffect(() => {
    loadData();
  }, [search, dateFilter]);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductSuggestions([]);
    } else {
      const q = productQuery.toLowerCase();
      const matches = products.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
      setProductSuggestions(matches.slice(0, 8));
    }
  }, [productQuery, products]);

  const loadData = async () => {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    const now = new Date();

    if (dateFilter === 'today') {
      dateFrom = now.toISOString().split('T')[0];
      dateTo = dateFrom;
    } else if (dateFilter === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateFrom = yest.toISOString().split('T')[0];
      dateTo = dateFrom;
    } else if (dateFilter === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom = lastWeek.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    } else if (dateFilter === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFrom = monthStart.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    } else if (dateFilter === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFrom = start.toISOString().split('T')[0];
      dateTo = end.toISOString().split('T')[0];
    } else if (dateFilter === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      dateFrom = start.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    }

    const pList = await PurchasesService.getAll(search, dateFrom, dateTo);
    setPurchases(pList);
    const sList = await SuppliersService.getAll();
    setSuppliers(sList);
    const prodList = await ProductsService.getAll();
    setProducts(prodList);
  };

  const handleOpenCreateModal = async () => {
    setEditingPurchaseId(null);
    setSelectedSupplierId(suppliers.length > 0 ? suppliers[0].id : null);
    setCustomPurchaseDate(new Date().toISOString().split('T')[0]);
    const nextNum = await PurchasesService.generatePurchaseNumber();
    setCustomPurchaseNum(nextNum);
    setPurchaseItems([]);
    setPaidAmount('');
    setInvoiceNote('');
    setProductQuery('');
    setProductSuggestions([]);
    setInvoiceModalVisible(true);
  };

  const handleOpenEditModal = (purchase: PurchaseRecord) => {
    setEditingPurchaseId(purchase.id);
    setSelectedSupplierId(purchase.supplier_id);
    setCustomPurchaseDate(purchase.purchase_date.split('T')[0]);
    setCustomPurchaseNum(purchase.purchase_number);
    setPaidAmount(purchase.paid_cents ? agorotToShekels(purchase.paid_cents).toString() : '');
    setInvoiceNote(purchase.note || '');

    const items = (purchase.items || []).map((it: any) => {
      const prod = products.find(p => p.id === it.product_id) || {
        id: it.product_id,
        name: it.product_name || 'صنف',
        barcode: '',
        unit: 'حبة',
        cost_price_cents: it.unit_cost_cents,
        sale_price_cents: it.unit_cost_cents,
        stock_quantity: 0,
        min_stock_quantity: 5,
        active: 1,
        category_id: 1,
      };
      return {
        product: prod,
        quantity: it.quantity,
        unitCost: agorotToShekels(it.unit_cost_cents).toString(),
      };
    });
    setPurchaseItems(items);
    setProductQuery('');
    setProductSuggestions([]);
    setDetailsModalVisible(false);
    setInvoiceModalVisible(true);
  };

  const handleSelectProductSuggestion = (prod: Product) => {
    const existing = purchaseItems.find(item => item.product.id === prod.id);
    if (existing) {
      setPurchaseItems(purchaseItems.map(item =>
        item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setPurchaseItems([
        ...purchaseItems,
        { product: prod, quantity: 1, unitCost: agorotToShekels(prod.cost_price_cents).toString() },
      ]);
    }
    setProductQuery('');
    setProductSuggestions([]);
  };

  const handleRemoveItem = (productId: number) => {
    setPurchaseItems(purchaseItems.filter(item => item.product.id !== productId));
  };

  const calculateSubtotal = () => {
    return purchaseItems.reduce((sum, item) => {
      const costCents = shekelsToAgorot(item.unitCost || '0');
      return sum + costCents * item.quantity;
    }, 0);
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplierId) {
      Alert.alert('تنبيه', 'يرجى اختيار المورد أو إضافته سريعاً');
      return;
    }
    if (purchaseItems.length === 0) {
      Alert.alert('تنبيه', 'يرجى إضافة أصناف إلى فاتورة الشراء');
      return;
    }

    const subtotalCents = calculateSubtotal();
    const paidCents = paidAmount ? shekelsToAgorot(paidAmount) : subtotalCents;

    const items: PurchaseItemInput[] = purchaseItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_cost_cents: shekelsToAgorot(item.unitCost || '0'),
    }));

    try {
      if (editingPurchaseId) {
        // Update existing purchase
        await PurchasesService.updatePurchase(editingPurchaseId, {
          supplierId: selectedSupplierId,
          purchaseNumber: customPurchaseNum,
          purchaseDate: `${customPurchaseDate}T${new Date().toTimeString().split(' ')[0]}`,
          items,
          subtotalCents,
          discountCents: 0,
          totalCents: subtotalCents,
          paidCents,
          note: invoiceNote,
          userId: user?.id,
        });
        Alert.alert('تم بنجاح', 'تم تعديل فاتورة الشراء وتحديث الأرصدة والمخزون بنجاح');
      } else {
        // Create new purchase
        await PurchasesService.createPurchase({
          supplierId: selectedSupplierId,
          purchaseNumber: customPurchaseNum,
          purchaseDate: `${customPurchaseDate}T${new Date().toTimeString().split(' ')[0]}`,
          items,
          subtotalCents,
          discountCents: 0,
          totalCents: subtotalCents,
          paidCents,
          note: invoiceNote,
          userId: user?.id,
        });
        Alert.alert('تم بنجاح', 'تم حفظ فاتورة الشراء وتحديث الصندوق ومستحقات المورد');
      }

      setInvoiceModalVisible(false);
      setPurchaseItems([]);
      setSelectedSupplierId(null);
      setPaidAmount('');
      setInvoiceNote('');
      loadData();
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل حفظ فاتورة الشراء');
    }
  };

  // Quick Add Supplier Action
  const handleQuickAddSupplier = async () => {
    if (!newSuppName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المورد');
      return;
    }
    try {
      const newId = await SuppliersService.add({
        name: newSuppName.trim(),
        phone: newSuppPhone.trim() || undefined,
        address: newSuppAddress.trim() || undefined,
        notes: newSuppNotes.trim() || undefined,
      });

      const updatedSuppliers = await SuppliersService.getAll();
      setSuppliers(updatedSuppliers);
      setSelectedSupplierId(newId);

      setNewSuppName('');
      setNewSuppPhone('');
      setNewSuppAddress('');
      setNewSuppNotes('');
      setQuickSupplierModal(false);
      Alert.alert('تم بنجاح', 'تمت إضافة المورد واختياره للفاتورة');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل إضافة المورد');
    }
  };

  // Quick Add Product Action
  const handleQuickAddProduct = async () => {
    if (!newProdName.trim() || !newProdCost.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الصنف وسعر الشراء');
      return;
    }
    try {
      const costCents = shekelsToAgorot(newProdCost);
      const saleCents = newProdSale ? shekelsToAgorot(newProdSale) : Math.round(costCents * 1.3);
      const barcode = newProdBarcode.trim() || Date.now().toString().slice(-8);

      const newId = await ProductsService.add({
        barcode,
        name: newProdName.trim(),
        category_id: 1,
        unit: newProdUnit,
        cost_price_cents: costCents,
        sale_price_cents: saleCents,
        stock_quantity: 0,
        min_stock_quantity: 5,
        supplier_id: selectedSupplierId || undefined,
      });

      const newProduct: Product = {
        id: newId,
        barcode,
        name: newProdName.trim(),
        category_id: 1,
        unit: newProdUnit,
        cost_price_cents: costCents,
        sale_price_cents: saleCents,
        stock_quantity: 0,
        min_stock_quantity: 5,
        active: 1,
      };

      const updatedProducts = await ProductsService.getAll();
      setProducts(updatedProducts);

      handleSelectProductSuggestion(newProduct);

      setNewProdName('');
      setNewProdBarcode('');
      setNewProdCost('');
      setNewProdSale('');
      setQuickProductModal(false);
      Alert.alert('تم بنجاح', 'تم إنشاء الصنف وإدراجه في الفاتورة');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل إنشاء الصنف');
    }
  };

  const handleDeletePurchase = (purchase: PurchaseRecord) => {
    Alert.alert(
      'تأكيد حذف فاتورة الشراء',
      `هل أنت متأكد من حذف فاتورة الشراء رقم (${purchase.purchase_number})؟\nسيتم عكس كميات المخزون المضافة وخصم المستحقات المالية للمورد تلقائياً.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف الفاتورة',
          style: 'destructive',
          onPress: async () => {
            await PurchasesService.deletePurchase(purchase.id);
            setDetailsModalVisible(false);
            loadData();
            Alert.alert('تم بنجاح', 'تم حذف فاتورة الشراء وتصحيح المخزون وحساب المورد.');
          },
        },
      ]
    );
  };

  const handleExportPDF = async (purchase: PurchaseRecord) => {
    try {
      const full = await PurchasesService.getPurchaseById(purchase.id);
      if (full) {
        await PdfExportService.exportPurchaseInvoicePDF(full);
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل تصدير الفاتورة كـ PDF');
    }
  };

  const filteredPurchases = purchases.filter(p => {
    if (statusFilter === 'paid') return p.remaining_cents === 0;
    if (statusFilter === 'remaining') return p.remaining_cents > 0;
    return true;
  });

  const totalPurchasesCents = filteredPurchases.reduce((sum, p) => sum + p.total_cents, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="فواتير الشراء والبضاعة" showBack={!!onBack} onBackPress={onBack} />

      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.onSurfaceVariant} />
          <TextInput
            style={[styles.input, { color: theme.onSurface }]}
            placeholder="بحث برقم الفاتورة أو اسم المورد..."
            placeholderTextColor={theme.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Date Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
          {[
            { key: 'all', label: 'كل الفترات' },
            { key: 'today', label: 'اليوم' },
            { key: 'yesterday', label: 'الأمس' },
            { key: 'week', label: 'آخر 7 أيام' },
            { key: 'month', label: 'هذا الشهر' },
            { key: 'last_month', label: 'الشهر الماضي' },
            { key: 'year', label: 'هذه السنة' },
          ].map(f => {
            const isSelected = dateFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  isSelected
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                ]}
                onPress={() => setDateFilter(f.key as any)}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? theme.onPrimary : theme.onSurface }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status Filters */}
        <View style={styles.statusFilterRow}>
          {[
            { key: 'all', label: 'الكل' },
            { key: 'paid', label: 'مدفوعة بالكامل' },
            { key: 'remaining', label: 'بها متبقي (آجل)' },
          ].map(s => {
            const isSel = statusFilter === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.statusChip,
                  isSel
                    ? { backgroundColor: `${theme.primary}20`, borderColor: theme.primary, borderWidth: 1 }
                    : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                ]}
                onPress={() => setStatusFilter(s.key as any)}
              >
                <Text style={[styles.statusChipText, { color: isSel ? theme.primary : theme.onSurfaceVariant }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.sumBadge, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}>
            <Text style={[styles.sumBadgeText, { color: theme.primary }]}>
              {filteredPurchases.length} فواتير • {formatCurrency(totalPurchasesCents)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: theme.primary }]}
            onPress={handleOpenCreateModal}
          >
            <MaterialCommunityIcons name="plus" size={18} color={theme.onPrimary} />
            <Text style={[styles.newBtnText, { color: theme.onPrimary }]}>فاتورة شراء جديدة</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredPurchases}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={theme.outlineVariant} />
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>لا توجد فواتير شراء مسجلة بالفترة المحددة</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}
            onPress={async () => {
              const full = await PurchasesService.getPurchaseById(item.id);
              if (full) {
                setSelectedPurchase(full);
                setDetailsModalVisible(true);
              }
            }}
          >
            <View style={styles.rightInfo}>
              <View style={[styles.iconBox, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialCommunityIcons name="receipt" size={24} color={theme.primary} />
              </View>
              <View style={styles.details}>
                <Text style={[styles.invNum, { color: theme.onSurface }]}>{item.purchase_number}</Text>
                <Text style={[styles.suppName, { color: theme.onSurfaceVariant }]}>المورد: {item.supplier_name || 'مورد عام'}</Text>
                <Text style={[styles.date, { color: theme.onSurfaceVariant }]}>{new Date(item.purchase_date).toLocaleDateString('ar-EG')}</Text>
              </View>
            </View>

            <View style={styles.leftInfo}>
              <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>الإجمالي:</Text>
              <Text style={[styles.totalAmount, { color: theme.primary }]}>{formatCurrency(item.total_cents)}</Text>
              {item.remaining_cents > 0 ? (
                <Text style={[styles.remaining, { color: theme.error }]}>متبقي: {formatCurrency(item.remaining_cents)}</Text>
              ) : (
                <Text style={[styles.paidBadge, { color: theme.primary }]}>مدفوع بالكامل</Text>
              )}

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: `${theme.primary}15` }]}
                  onPress={() => handleExportPDF(item)}
                >
                  <MaterialCommunityIcons name="file-pdf-box" size={16} color={theme.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.miniBtn, { backgroundColor: `${theme.error}15` }]}
                  onPress={() => handleDeletePurchase(item)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Details Modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
                تفاصيل فاتورة الشراء {selectedPurchase?.purchase_number}
              </Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.onSurfaceVariant }]}>المورد:</Text>
                <Text style={[styles.detailVal, { color: theme.onSurface }]}>{selectedPurchase?.supplier_name || 'مورد عام'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.onSurfaceVariant }]}>التاريخ:</Text>
                <Text style={[styles.detailVal, { color: theme.onSurface }]}>
                  {selectedPurchase ? new Date(selectedPurchase.purchase_date).toLocaleString('ar-EG') : ''}
                </Text>
              </View>

              <Text style={[styles.subHeading, { color: theme.onSurface }]}>الأصناف المشتراة:</Text>
              {selectedPurchase?.items?.map((it: any, idx: number) => (
                <View key={idx} style={[styles.itemCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: theme.onSurface }]}>{it.product_name || 'صنف'}</Text>
                    <Text style={[styles.itemQty, { color: theme.onSurfaceVariant }]}>
                      {it.quantity} × {formatCurrency(it.unit_cost_cents)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.primary }]}>{formatCurrency(it.line_total_cents)}</Text>
                </View>
              ))}

              <View style={[styles.sumTotalBox, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
                <View style={styles.sumLine}>
                  <Text style={[styles.sumLabel, { color: theme.onSurface }]}>المجموع الكلي:</Text>
                  <Text style={[styles.sumValue, { color: theme.primary }]}>{formatCurrency(selectedPurchase?.total_cents || 0)}</Text>
                </View>
                <View style={styles.sumLine}>
                  <Text style={[styles.sumLabel, { color: theme.onSurfaceVariant }]}>المدفوع للمورد:</Text>
                  <Text style={[styles.sumValue, { color: theme.onSurface }]}>{formatCurrency(selectedPurchase?.paid_cents || 0)}</Text>
                </View>
                {(selectedPurchase?.remaining_cents || 0) > 0 && (
                  <View style={styles.sumLine}>
                    <Text style={[styles.sumLabel, { color: theme.error }]}>المتبقي (مستحق للمورد):</Text>
                    <Text style={[styles.sumValue, { color: theme.error }]}>{formatCurrency(selectedPurchase?.remaining_cents || 0)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={[styles.modalBtnAction, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (selectedPurchase) handleOpenEditModal(selectedPurchase);
                  }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.onPrimary} />
                  <Text style={[styles.modalBtnActionText, { color: theme.onPrimary }]}>تعديل الفاتورة</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtnAction, { backgroundColor: theme.secondary }]}
                  onPress={() => {
                    if (selectedPurchase) handleExportPDF(selectedPurchase);
                  }}
                >
                  <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.onPrimary} />
                  <Text style={[styles.modalBtnActionText, { color: theme.onPrimary }]}>تصدير PDF</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create / Edit Purchase Modal */}
      <Modal visible={invoiceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
                {editingPurchaseId ? 'تعديل فاتورة الشراء' : 'إنشاء فاتورة شراء جديدة'}
              </Text>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {/* Invoice Number & Date */}
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>رقم الفاتورة *</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    value={customPurchaseNum}
                    onChangeText={setCustomPurchaseNum}
                    placeholder="PUR-0001"
                    placeholderTextColor={theme.onSurfaceVariant}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>تاريخ الفاتورة (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    value={customPurchaseDate}
                    onChangeText={setCustomPurchaseDate}
                    placeholder="2026-08-17"
                    placeholderTextColor={theme.onSurfaceVariant}
                  />
                </View>
              </View>

              {/* Select Supplier + Quick Add */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>اختر المورد *</Text>
                <TouchableOpacity
                  style={[styles.quickAddBtn, { backgroundColor: `${theme.primary}15` }]}
                  onPress={() => setQuickSupplierModal(true)}
                >
                  <MaterialCommunityIcons name="account-plus" size={14} color={theme.primary} />
                  <Text style={[styles.quickAddBtnText, { color: theme.primary }]}>+ مورد جديد</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                {suppliers.map(s => {
                  const isSelected = selectedSupplierId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.chip,
                        isSelected
                          ? { backgroundColor: theme.primary }
                          : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                      ]}
                      onPress={() => setSelectedSupplierId(s.id)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? theme.onPrimary : theme.onSurface }]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Autocomplete Product Search */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>بحث وإضافة صنف (اكتب الحروف الأولى):</Text>
                <TouchableOpacity
                  style={[styles.quickAddBtn, { backgroundColor: `${theme.primary}15` }]}
                  onPress={() => setQuickProductModal(true)}
                >
                  <MaterialCommunityIcons name="plus-box" size={14} color={theme.primary} />
                  <Text style={[styles.quickAddBtnText, { color: theme.primary }]}>+ صنف جديد</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.autocompleteInputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
                <MaterialCommunityIcons name="magnify" size={18} color={theme.onSurfaceVariant} />
                <TextInput
                  style={[styles.autoInput, { color: theme.onSurface }]}
                  placeholder="اكتب اسم الصنف أو الباركود (مثال: جل)..."
                  placeholderTextColor={theme.onSurfaceVariant}
                  value={productQuery}
                  onChangeText={setProductQuery}
                />
                {productQuery ? (
                  <TouchableOpacity onPress={() => setProductQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={16} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Suggestions Dropdown */}
              {productSuggestions.length > 0 && (
                <View style={[styles.suggestionsBox, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.primary }]}>
                  {productSuggestions.map(prod => (
                    <TouchableOpacity
                      key={prod.id}
                      style={[styles.suggestionItem, { borderBottomColor: theme.outlineVariant }]}
                      onPress={() => handleSelectProductSuggestion(prod)}
                    >
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={[styles.sugName, { color: theme.onSurface }]}>{prod.name}</Text>
                        <Text style={[styles.sugSub, { color: theme.onSurfaceVariant }]}>
                          المتوفر: {prod.stock_quantity} {prod.unit} • تكلفة: {formatCurrency(prod.cost_price_cents)}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="plus-circle" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected Items Table */}
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>الأصناف في الفاتورة ({purchaseItems.length})</Text>
              {purchaseItems.length === 0 ? (
                <View style={[styles.emptyItemsBox, { borderColor: theme.outlineVariant }]}>
                  <Text style={[styles.emptyItemsText, { color: theme.onSurfaceVariant }]}>
                    ابحث عن الأصناف بالأعلى أو أضف صنفاً جديداً لإدراجه هنا
                  </Text>
                </View>
              ) : (
                purchaseItems.map(item => (
                  <View key={item.product.id} style={[styles.itemRow, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.rowProdName, { color: theme.onSurface }]}>{item.product.name}</Text>
                      <Text style={[styles.rowUnit, { color: theme.onSurfaceVariant }]}>الوحدة: {item.product.unit || 'حبة'}</Text>
                    </View>

                    <View style={styles.rowInputs}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.miniLabel, { color: theme.onSurfaceVariant }]}>الكمية</Text>
                        <TextInput
                          style={[styles.miniInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                          keyboardType="numeric"
                          value={item.quantity.toString()}
                          onChangeText={txt => {
                            const q = parseInt(txt || '0', 10);
                            setPurchaseItems(purchaseItems.map(i => i.product.id === item.product.id ? { ...i, quantity: q } : i));
                          }}
                        />
                      </View>

                      <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.miniLabel, { color: theme.onSurfaceVariant }]}>سعر الشراء (₪)</Text>
                        <TextInput
                          style={[styles.miniInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                          keyboardType="numeric"
                          value={item.unitCost}
                          onChangeText={txt => {
                            setPurchaseItems(purchaseItems.map(i => i.product.id === item.product.id ? { ...i, unitCost: txt } : i));
                          }}
                        />
                      </View>

                      <TouchableOpacity onPress={() => handleRemoveItem(item.product.id)} style={{ marginTop: 14 }}>
                        <MaterialCommunityIcons name="delete-outline" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Total & Payment */}
              <View style={[styles.summaryBox, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: theme.onSurface }]}>المجموع الكلي:</Text>
                  <Text style={[styles.sumValue, { color: theme.primary }]}>{formatCurrency(calculateSubtotal())}</Text>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>المبلغ المدفوع نقداً من الصندوق (₪):</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="اتركه فارغاً إذا تم دفع كامل المبلغ"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="numeric"
                value={paidAmount}
                onChangeText={setPaidAmount}
              />

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>ملاحظات:</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="رقم سند الشحن أو ملاحظات إضافية"
                placeholderTextColor={theme.onSurfaceVariant}
                value={invoiceNote}
                onChangeText={setInvoiceNote}
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSavePurchase}>
                <MaterialCommunityIcons name="check" size={22} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>
                  {editingPurchaseId ? 'حفظ التعديلات' : 'اعتماد وحفظ فاتورة الشراء'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Add Supplier Modal */}
      <Modal visible={quickSupplierModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.quickModalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>إضافة مورد جديد سريع</Text>
              <TouchableOpacity onPress={() => setQuickSupplierModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>اسم المورد *</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="اسم المورد أو الشركة"
                placeholderTextColor={theme.onSurfaceVariant}
                value={newSuppName}
                onChangeText={setNewSuppName}
              />

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>رقم الهاتف / الجوال</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="050-000-0000"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="phone-pad"
                value={newSuppPhone}
                onChangeText={setNewSuppPhone}
              />

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>العنوان / المدينة</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="مثال: الخليل، شارع السلام"
                placeholderTextColor={theme.onSurfaceVariant}
                value={newSuppAddress}
                onChangeText={setNewSuppAddress}
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleQuickAddSupplier}>
                <MaterialCommunityIcons name="account-check" size={20} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>حفظ واختيار المورد</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Add Product Modal */}
      <Modal visible={quickProductModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.quickModalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>إضافة صنف جديد سريع</Text>
              <TouchableOpacity onPress={() => setQuickProductModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>اسم الصنف *</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="مثال: زيت زيتون 1 لتر"
                placeholderTextColor={theme.onSurfaceVariant}
                value={newProdName}
                onChangeText={setNewProdName}
              />

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>الباركود / رمز الصنف</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="توليد تلقائي إن ترك فارغاً"
                placeholderTextColor={theme.onSurfaceVariant}
                value={newProdBarcode}
                onChangeText={setNewProdBarcode}
              />

              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>سعر الشراء (₪) *</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.onSurfaceVariant}
                    keyboardType="numeric"
                    value={newProdCost}
                    onChangeText={setNewProdCost}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>سعر البيع (₪)</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.onSurfaceVariant}
                    keyboardType="numeric"
                    value={newProdSale}
                    onChangeText={setNewProdSale}
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleQuickAddProduct}>
                <MaterialCommunityIcons name="cube-send" size={20} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>حفظ وإدراج في الفاتورة</Text>
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
  searchSection: { padding: 12, gap: 8 },
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
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginLeft: 6 },
  filterChipText: { fontSize: 11, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  statusFilterRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sumBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  sumBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic' },
  newBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  newBtnText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
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
  invNum: { fontSize: 15, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  suppName: { fontSize: 12, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  date: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  leftInfo: { alignItems: 'flex-start', gap: 2 },
  totalLabel: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic' },
  totalAmount: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  remaining: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  paidBadge: { fontSize: 11, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  cardActionsRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 4 },
  miniBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'IBM Plex Sans Arabic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '90%' },
  quickModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailLabel: { fontSize: 13, fontFamily: 'IBM Plex Sans Arabic' },
  detailVal: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  subHeading: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', marginTop: 8, textAlign: 'right' },
  itemCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1 },
  itemName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  itemQty: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  itemTotal: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  sumTotalBox: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4, gap: 4 },
  sumLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  sumValue: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  modalActionButtons: { flexDirection: 'row-reverse', gap: 10, marginTop: 12, marginBottom: 20 },
  modalBtnAction: { flex: 1, height: 46, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modalBtnActionText: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  sectionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  quickAddBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  quickAddBtnText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 6 },
  chipText: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  autocompleteInputBox: { height: 44, borderRadius: 10, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  autoInput: { flex: 1, textAlign: 'right', fontSize: 12, fontFamily: 'IBM Plex Sans Arabic' },
  suggestionsBox: { borderRadius: 10, borderWidth: 1, maxHeight: 150, marginVertical: 4, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottomWidth: 1 },
  sugName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  sugSub: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  emptyItemsBox: { padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, marginVertical: 6 },
  emptyItemsText: { fontSize: 12, fontFamily: 'IBM Plex Sans Arabic' },
  itemRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1 },
  rowProdName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  rowUnit: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  rowInputs: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  miniLabel: { fontSize: 9, fontFamily: 'IBM Plex Sans Arabic' },
  miniInput: { width: 54, height: 34, borderRadius: 6, borderWidth: 1, textAlign: 'center', fontSize: 12, fontFamily: 'IBM Plex Sans Arabic' },
  summaryBox: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  sumRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  inputBox: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, textAlign: 'right', fontSize: 13, fontFamily: 'IBM Plex Sans Arabic' },
  saveBtn: { height: 46, borderRadius: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 15 },
  saveBtnText: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
});
