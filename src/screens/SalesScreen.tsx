import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { SalesService, SaleRecord, CartItem } from '../services/sales.service';
import { ProductsService, Product } from '../services/products.service';
import { CustomersService, Customer } from '../services/customers.service';
import { PdfExportService } from '../services/pdf-export.service';
import { formatCurrency, shekelsToAgorot, agorotToShekels } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface SalesScreenProps {
  onBack?: () => void;
  onViewReceipt?: (sale: SaleRecord) => void;
}

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year';

export const SalesScreen: React.FC<SalesScreenProps> = ({ onBack, onViewReceipt }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'card' | 'credit'>('all');

  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // New / Edit Sale Modal State
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customSaleDate, setCustomSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleItems, setSaleItems] = useState<{ product: Product; quantity: number; unitPrice: string }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');

  // Autocomplete Live Search State
  const [productQuery, setProductQuery] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);

  // Quick Add Customer Sub-Modal State
  const [quickCustomerModal, setQuickCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Quick Add Product Sub-Modal State
  const [quickProductModal, setQuickProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('حبة');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdSale, setNewProdSale] = useState('');
  const [newProdStock, setNewProdStock] = useState('50');

  useEffect(() => {
    loadSales();
  }, [search, dateFilter]);

  useEffect(() => {
    loadAuxData();
  }, []);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductSuggestions([]);
    } else {
      const q = productQuery.toLowerCase();
      const matches = products.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
      setProductSuggestions(matches.slice(0, 8));
    }
  }, [productQuery, products]);

  const loadAuxData = async () => {
    const custs = await CustomersService.getAll();
    setCustomers(custs);
    const prods = await ProductsService.getAll();
    setProducts(prods);
  };

  const loadSales = async () => {
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

    const data = await SalesService.getAllSales(search, dateFrom, dateTo);
    setSales(data);
  };

  const handleOpenCreateModal = () => {
    setEditingSaleId(null);
    setSelectedCustomerId(null);
    setCustomSaleDate(new Date().toISOString().split('T')[0]);
    setSaleItems([]);
    setPaymentMethod('cash');
    setPaidAmount('');
    setInvoiceNote('');
    setProductQuery('');
    setProductSuggestions([]);
    setInvoiceModalVisible(true);
  };

  const handleOpenEditModal = (sale: SaleRecord) => {
    setEditingSaleId(sale.id);
    setSelectedCustomerId(sale.customer_id || null);
    setCustomSaleDate(sale.sale_date.split('T')[0]);
    setPaymentMethod((sale.payment_method as any) || 'cash');
    setPaidAmount(sale.paid_cents ? agorotToShekels(sale.paid_cents).toString() : '');
    setInvoiceNote(sale.note || '');

    const items = (sale.items || []).map(it => {
      const prod = products.find(p => p.id === it.product_id) || {
        id: it.product_id,
        name: it.product_name,
        barcode: it.barcode,
        unit: 'حبة',
        cost_price_cents: 0,
        sale_price_cents: it.unit_price_cents,
        stock_quantity: 999,
        min_stock_quantity: 5,
        active: 1,
        category_id: 1,
      };
      return {
        product: prod,
        quantity: it.quantity,
        unitPrice: agorotToShekels(it.unit_price_cents).toString(),
      };
    });
    setSaleItems(items);
    setProductQuery('');
    setProductSuggestions([]);
    setDetailsModalVisible(false);
    setInvoiceModalVisible(true);
  };

  const handleSelectProductSuggestion = (prod: Product) => {
    if (prod.stock_quantity <= 0) {
      Alert.alert('تنبيه المخزون', `الصنف (${prod.name}) غير متوفر حالياً في المخزن (الرصيد: 0)!`);
      return;
    }

    const existing = saleItems.find(item => item.product.id === prod.id);
    if (existing) {
      if (existing.quantity + 1 > prod.stock_quantity) {
        Alert.alert('تنبيه المخزون', `لا يمكنك تجاوز الكمية المتوفرة في المخزن (${prod.stock_quantity})!`);
        return;
      }
      setSaleItems(saleItems.map(item =>
        item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSaleItems([
        ...saleItems,
        { product: prod, quantity: 1, unitPrice: agorotToShekels(prod.sale_price_cents).toString() },
      ]);
    }
    setProductQuery('');
    setProductSuggestions([]);
  };

  const handleUpdateItemQuantity = (productId: number, newQtyStr: string) => {
    const q = parseInt(newQtyStr || '0', 10);
    const item = saleItems.find(i => i.product.id === productId);
    if (!item) return;

    if (q > item.product.stock_quantity && !editingSaleId) {
      Alert.alert(
        'تنبيه المخزون',
        `الكمية المطلوبة (${q}) أكبر من المتوفر في المخزن (${item.product.stock_quantity}) لصنف (${item.product.name})!`
      );
      return;
    }

    setSaleItems(saleItems.map(i => (i.product.id === productId ? { ...i, quantity: q } : i)));
  };

  const handleRemoveItem = (productId: number) => {
    setSaleItems(saleItems.filter(item => item.product.id !== productId));
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => {
      const priceCents = shekelsToAgorot(item.unitPrice || '0');
      return sum + priceCents * item.quantity;
    }, 0);
  };

  const handleSaveSale = async () => {
    if (saleItems.length === 0) {
      Alert.alert('تنبيه', 'يرجى إضافة أصناف إلى فاتورة البيع');
      return;
    }

    // Strict validation
    for (const it of saleItems) {
      if (it.quantity <= 0) {
        Alert.alert('تنبيه', `يرجى تحديد كمية صالحة للصنف (${it.product.name})`);
        return;
      }
    }

    const totalCents = calculateSubtotal();
    let paidCents = totalCents;
    if (paymentMethod === 'credit') {
      paidCents = paidAmount ? shekelsToAgorot(paidAmount) : 0;
    } else if (paidAmount) {
      paidCents = shekelsToAgorot(paidAmount);
    }

    const items: CartItem[] = saleItems.map(item => ({
      product_id: item.product.id,
      barcode: item.product.barcode,
      name: item.product.name,
      unit_price_cents: shekelsToAgorot(item.unitPrice || '0'),
      quantity: item.quantity,
    }));

    try {
      if (editingSaleId) {
        // Update existing sale
        await SalesService.updateSale(editingSaleId, {
          customerId: selectedCustomerId || undefined,
          cashierId: user?.id || 1,
          items,
          subtotalCents: totalCents,
          discountCents: 0,
          totalCents,
          paidCents,
          paymentMethod,
          note: invoiceNote,
          saleDate: `${customSaleDate}T${new Date().toTimeString().split(' ')[0]}`,
        });
        Alert.alert('تم بنجاح', 'تم تعديل فاتورة البيع وتحديث المخزون والأرصدة بنجاح');
      } else {
        // Create new sale
        const completed = await SalesService.completeSale({
          customerId: selectedCustomerId || undefined,
          cashierId: user?.id || 1,
          items,
          subtotalCents: totalCents,
          discountCents: 0,
          totalCents,
          paidCents,
          paymentMethod,
          note: invoiceNote,
          saleDate: `${customSaleDate}T${new Date().toTimeString().split(' ')[0]}`,
        });
        Alert.alert('تم بنجاح', `تم حفظ الفاتورة رقم ${completed.invoice_number} بنجاح.`);
        if (onViewReceipt) onViewReceipt(completed);
      }

      setInvoiceModalVisible(false);
      setSaleItems([]);
      setSelectedCustomerId(null);
      setPaidAmount('');
      setInvoiceNote('');
      loadSales();
      loadAuxData();
    } catch (e: any) {
      Alert.alert('خطأ في العملية', e.message || 'فشل حفظ الفاتورة');
    }
  };

  // Quick Add Customer Action
  const handleQuickAddCustomer = async () => {
    if (!newCustName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العميل');
      return;
    }
    try {
      const newId = await CustomersService.add({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        address: newCustAddress.trim() || undefined,
        credit_limit_cents: 100000,
      });

      const updatedCusts = await CustomersService.getAll();
      setCustomers(updatedCusts);
      setSelectedCustomerId(newId);

      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setQuickCustomerModal(false);
      Alert.alert('تم بنجاح', 'تمت إضافة العميل واختياره للفاتورة');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل إضافة العميل');
    }
  };

  // Quick Add Product Action
  const handleQuickAddProduct = async () => {
    if (!newProdName.trim() || !newProdSale.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الصنف وسعر البيع');
      return;
    }
    try {
      const saleCents = shekelsToAgorot(newProdSale);
      const costCents = newProdCost ? shekelsToAgorot(newProdCost) : Math.round(saleCents * 0.7);
      const barcode = newProdBarcode.trim() || Date.now().toString().slice(-8);
      const initStock = parseInt(newProdStock || '0', 10);

      const newId = await ProductsService.add({
        barcode,
        name: newProdName.trim(),
        category_id: 1,
        unit: newProdUnit,
        cost_price_cents: costCents,
        sale_price_cents: saleCents,
        stock_quantity: initStock,
        min_stock_quantity: 5,
      });

      const newProduct: Product = {
        id: newId,
        barcode,
        name: newProdName.trim(),
        category_id: 1,
        unit: newProdUnit,
        cost_price_cents: costCents,
        sale_price_cents: saleCents,
        stock_quantity: initStock,
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

  const handleDeleteSale = (sale: SaleRecord) => {
    Alert.alert(
      'تأكيد حذف الفاتورة',
      `هل أنت متأكد من حذف الفاتورة رقم (${sale.invoice_number})؟\nسيتم استرجاع الكميات المباعة إلى المخزون وتصحيح رصيد الصندوق والديون تلقائياً.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف الفاتورة',
          style: 'destructive',
          onPress: async () => {
            await SalesService.deleteSale(sale.id);
            setDetailsModalVisible(false);
            loadSales();
            loadAuxData();
            Alert.alert('تم بنجاح', 'تم حذف الفاتورة واسترجاع أصنافها للمخزون بنجاح.');
          },
        },
      ]
    );
  };

  const handleExportPDF = async (sale: SaleRecord) => {
    try {
      const fullSale = await SalesService.getSaleById(sale.id);
      if (fullSale) {
        await PdfExportService.exportSaleInvoicePDF(fullSale);
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل تصدير الفاتورة كـ PDF');
    }
  };

  const handleExportAllSalesPDF = async () => {
    try {
      await PdfExportService.exportSalesListPDF(filteredSales);
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل تصدير سجل المبيعات كـ PDF');
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'cash': return { label: 'نقدي (كاش)', color: theme.primary };
      case 'card': return { label: 'شبكة / بطاقة', color: theme.secondary };
      case 'credit': return { label: 'بيع آجل (دين)', color: theme.error };
      default: return { label: 'متعدد', color: theme.tertiary };
    }
  };

  const filteredSales = sales.filter(s => {
    if (methodFilter === 'all') return true;
    return s.payment_method === methodFilter;
  });

  const totalSalesCents = filteredSales.reduce((sum, s) => sum + s.total_cents, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="سجل فواتير المبيعات" showBack={!!onBack} onBackPress={onBack} />

      {/* Top Controls & Search */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.onSurfaceVariant} />
          <TextInput
            style={[styles.input, { color: theme.onSurface }]}
            placeholder="بحث برقم الفاتورة أو اسم العميل..."
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

        {/* Payment Method Filter */}
        <View style={styles.methodFilterRow}>
          {[
            { key: 'all', label: 'كل طرق الدفع' },
            { key: 'cash', label: 'نقدي (كاش)' },
            { key: 'card', label: 'شبكة' },
            { key: 'credit', label: 'آجل (دين)' },
          ].map(m => {
            const isSel = methodFilter === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.methodFilterChip,
                  isSel
                    ? { backgroundColor: `${theme.primary}20`, borderColor: theme.primary, borderWidth: 1 }
                    : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                ]}
                onPress={() => setMethodFilter(m.key as any)}
              >
                <Text style={[styles.methodFilterText, { color: isSel ? theme.primary : theme.onSurfaceVariant }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Row */}
        <View style={styles.topActionsRow}>
          <View style={[styles.sumBadge, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}>
            <Text style={[styles.sumBadgeText, { color: theme.primary }]}>
              {filteredSales.length} فواتير • {formatCurrency(totalSalesCents)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={handleOpenCreateModal}
            >
              <MaterialCommunityIcons name="plus" size={18} color={theme.onPrimary} />
              <Text style={[styles.addBtnText, { color: theme.onPrimary }]}>فاتورة جديدة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportAllBtn, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 }]}
              onPress={handleExportAllSalesPDF}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sales Invoices List */}
      <FlatList
        data={filteredSales}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="receipt" size={48} color={theme.outlineVariant} />
            <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>لا توجد فواتير مبيعات مسجلة بالفترة المحددة</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getMethodBadge(item.payment_method);
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}
              onPress={async () => {
                const full = await SalesService.getSaleById(item.id);
                if (full) {
                  setSelectedSale(full);
                  setDetailsModalVisible(true);
                }
              }}
            >
              <View style={styles.rightInfo}>
                <View style={[styles.iconBox, { backgroundColor: `${badge.color}15` }]}>
                  <MaterialCommunityIcons name="receipt" size={22} color={badge.color} />
                </View>
                <View style={styles.details}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.invNum, { color: theme.onSurface }]}>{item.invoice_number}</Text>
                    <View style={[styles.badgeContainer, { backgroundColor: `${badge.color}15` }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.custName, { color: theme.onSurfaceVariant }]}>
                    العميل: {item.customer_name || 'عميل نقدي'}
                  </Text>
                  <Text style={[styles.dateText, { color: theme.onSurfaceVariant }]}>
                    {new Date(item.sale_date).toLocaleString('ar-EG')}
                  </Text>
                </View>
              </View>

              <View style={styles.leftInfo}>
                <Text style={[styles.totalAmount, { color: theme.primary }]}>{formatCurrency(item.total_cents)}</Text>
                {item.remaining_cents > 0 ? (
                  <Text style={[styles.debtText, { color: theme.error }]}>متبقي: {formatCurrency(item.remaining_cents)}</Text>
                ) : (
                  <Text style={[styles.paidText, { color: theme.primary }]}>مدفوع بالكامل</Text>
                )}

                <View style={styles.cardBtnRow}>
                  <TouchableOpacity
                    style={[styles.miniActionBtn, { backgroundColor: `${theme.primary}15` }]}
                    onPress={() => handleExportPDF(item)}
                  >
                    <MaterialCommunityIcons name="file-pdf-box" size={16} color={theme.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.miniActionBtn, { backgroundColor: `${theme.error}15` }]}
                    onPress={() => handleDeleteSale(item)}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Details Modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
                تفاصيل الفاتورة {selectedSale?.invoice_number}
              </Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <View style={[styles.infoRow, { borderColor: theme.outlineVariant }]}>
                <Text style={[styles.infoLabel, { color: theme.onSurfaceVariant }]}>العميل:</Text>
                <Text style={[styles.infoVal, { color: theme.onSurface }]}>{selectedSale?.customer_name || 'عميل نقدي'}</Text>
              </View>
              <View style={[styles.infoRow, { borderColor: theme.outlineVariant }]}>
                <Text style={[styles.infoLabel, { color: theme.onSurfaceVariant }]}>التاريخ:</Text>
                <Text style={[styles.infoVal, { color: theme.onSurface }]}>
                  {selectedSale ? new Date(selectedSale.sale_date).toLocaleString('ar-EG') : ''}
                </Text>
              </View>
              <View style={[styles.infoRow, { borderColor: theme.outlineVariant }]}>
                <Text style={[styles.infoLabel, { color: theme.onSurfaceVariant }]}>الكاشير:</Text>
                <Text style={[styles.infoVal, { color: theme.onSurface }]}>{selectedSale?.cashier_name || 'مدير النظام'}</Text>
              </View>

              <Text style={[styles.sectionHeading, { color: theme.onSurface }]}>الأصناف المباعة:</Text>
              {selectedSale?.items?.map((it, idx) => (
                <View key={idx} style={[styles.itemCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: theme.onSurface }]}>{it.product_name}</Text>
                    <Text style={[styles.itemQty, { color: theme.onSurfaceVariant }]}>
                      {it.quantity} × {formatCurrency(it.unit_price_cents)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.primary }]}>{formatCurrency(it.line_total_cents)}</Text>
                </View>
              ))}

              <View style={[styles.sumTotalBox, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
                <View style={styles.sumLine}>
                  <Text style={[styles.sumLabel, { color: theme.onSurface }]}>الإجمالي النهائي:</Text>
                  <Text style={[styles.sumValue, { color: theme.primary }]}>{formatCurrency(selectedSale?.total_cents || 0)}</Text>
                </View>
                <View style={styles.sumLine}>
                  <Text style={[styles.sumLabel, { color: theme.onSurfaceVariant }]}>المدفوع:</Text>
                  <Text style={[styles.sumValue, { color: theme.onSurface }]}>{formatCurrency(selectedSale?.paid_cents || 0)}</Text>
                </View>
                {(selectedSale?.remaining_cents || 0) > 0 && (
                  <View style={styles.sumLine}>
                    <Text style={[styles.sumLabel, { color: theme.error }]}>المتبقي (دين):</Text>
                    <Text style={[styles.sumValue, { color: theme.error }]}>{formatCurrency(selectedSale?.remaining_cents || 0)}</Text>
                  </View>
                )}
              </View>

              {/* Actions inside modal */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtnModal, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (selectedSale) handleOpenEditModal(selectedSale);
                  }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.onPrimary} />
                  <Text style={[styles.actionBtnModalText, { color: theme.onPrimary }]}>تعديل الفاتورة</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtnModal, { backgroundColor: theme.secondary }]}
                  onPress={() => {
                    if (selectedSale) handleExportPDF(selectedSale);
                  }}
                >
                  <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.onPrimary} />
                  <Text style={[styles.actionBtnModalText, { color: theme.onPrimary }]}>تصدير PDF</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create / Edit Sale Modal */}
      <Modal visible={invoiceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
                {editingSaleId ? 'تعديل فاتورة البيع' : 'إضافة فاتورة بيع جديدة'}
              </Text>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {/* Date Input */}
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>تاريخ الفاتورة (YYYY-MM-DD) *</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                value={customSaleDate}
                onChangeText={setCustomSaleDate}
                placeholder="2026-08-17"
                placeholderTextColor={theme.onSurfaceVariant}
              />

              {/* Select Customer + Quick Add */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>العميل</Text>
                <TouchableOpacity
                  style={[styles.quickAddBtn, { backgroundColor: `${theme.primary}15` }]}
                  onPress={() => setQuickCustomerModal(true)}
                >
                  <MaterialCommunityIcons name="account-plus" size={14} color={theme.primary} />
                  <Text style={[styles.quickAddBtnText, { color: theme.primary }]}>+ عميل جديد</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedCustomerId === null
                      ? { backgroundColor: theme.primary }
                      : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                  ]}
                  onPress={() => setSelectedCustomerId(null)}
                >
                  <Text style={[styles.chipText, { color: selectedCustomerId === null ? theme.onPrimary : theme.onSurface }]}>
                    عميل نقدي
                  </Text>
                </TouchableOpacity>
                {customers.map(c => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.chip,
                        isSelected
                          ? { backgroundColor: theme.primary }
                          : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                      ]}
                      onPress={() => setSelectedCustomerId(c.id)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? theme.onPrimary : theme.onSurface }]}>
                        {c.name}
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
                        <Text style={[styles.sugSub, { color: prod.stock_quantity > 0 ? theme.onSurfaceVariant : theme.error }]}>
                          المتوفر بالمخزن: {prod.stock_quantity} {prod.unit} • السعر: {formatCurrency(prod.sale_price_cents)}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="plus-circle" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected Items */}
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>الأصناف في الفاتورة ({saleItems.length})</Text>
              {saleItems.length === 0 ? (
                <View style={[styles.emptyItemsBox, { borderColor: theme.outlineVariant }]}>
                  <Text style={[styles.emptyItemsText, { color: theme.onSurfaceVariant }]}>
                    ابحث عن الأصناف بالأعلى لإدراجها هنا
                  </Text>
                </View>
              ) : (
                saleItems.map(item => (
                  <View key={item.product.id} style={[styles.itemRow, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.rowProdName, { color: theme.onSurface }]}>{item.product.name}</Text>
                      <Text style={[styles.rowUnit, { color: theme.onSurfaceVariant }]}>
                        السعر: {item.unitPrice} ₪ • المتوفر بالمخزن: {item.product.stock_quantity}
                      </Text>
                    </View>

                    <View style={styles.rowInputs}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.miniLabel, { color: theme.onSurfaceVariant }]}>الكمية</Text>
                        <TextInput
                          style={[styles.miniInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                          keyboardType="numeric"
                          value={item.quantity.toString()}
                          onChangeText={txt => handleUpdateItemQuantity(item.product.id, txt)}
                        />
                      </View>

                      <TouchableOpacity onPress={() => handleRemoveItem(item.product.id)} style={{ marginTop: 14 }}>
                        <MaterialCommunityIcons name="delete-outline" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Payment Method */}
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>طريقة الدفع</Text>
              <View style={styles.methodRow}>
                {[
                  { key: 'cash', label: 'نقدي (كاش)' },
                  { key: 'card', label: 'شبكة / بطاقة' },
                  { key: 'credit', label: 'بيع آجل (دين)' },
                ].map(m => {
                  const isSel = paymentMethod === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.methodChip,
                        isSel ? { backgroundColor: theme.primary } : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                      ]}
                      onPress={() => setPaymentMethod(m.key as any)}
                    >
                      <Text style={[styles.methodChipText, { color: isSel ? theme.onPrimary : theme.onSurface }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Total Box */}
              <View style={[styles.sumTotalBox, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
                <View style={styles.sumLine}>
                  <Text style={[styles.sumLabel, { color: theme.onSurface }]}>المجموع الإجمالي:</Text>
                  <Text style={[styles.sumValue, { color: theme.primary }]}>{formatCurrency(calculateSubtotal())}</Text>
                </View>
              </View>

              {paymentMethod === 'credit' && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>الدفعة المقدمة المسددة حالياً (₪):</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="0 إذا لم يسدد شيئاً"
                    placeholderTextColor={theme.onSurfaceVariant}
                    keyboardType="numeric"
                    value={paidAmount}
                    onChangeText={setPaidAmount}
                  />
                </>
              )}

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>ملاحظات:</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="ملاحظات اختيارية"
                placeholderTextColor={theme.onSurfaceVariant}
                value={invoiceNote}
                onChangeText={setInvoiceNote}
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveSale}>
                <MaterialCommunityIcons name="check" size={22} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>
                  {editingSaleId ? 'حفظ التعديلات' : 'اعتماد وحفظ الفاتورة'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal visible={quickCustomerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.quickModalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>إضافة عميل جديد سريع</Text>
              <TouchableOpacity onPress={() => setQuickCustomerModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>اسم العميل *</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="اسم العميل الكامل"
                placeholderTextColor={theme.onSurfaceVariant}
                value={newCustName}
                onChangeText={setNewCustName}
              />

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>رقم الهاتف</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="050-000-0000"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="phone-pad"
                value={newCustPhone}
                onChangeText={setNewCustPhone}
              />

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>العنوان / المدينة</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="العنوان"
                placeholderTextColor={theme.onSurfaceVariant}
                value={newCustAddress}
                onChangeText={setNewCustAddress}
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleQuickAddCustomer}>
                <MaterialCommunityIcons name="account-check" size={20} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>حفظ واختيار العميل</Text>
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
                placeholder="مثال: جلباب نسائي"
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
                  <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>سعر البيع (₪) *</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.onSurfaceVariant}
                    keyboardType="numeric"
                    value={newProdSale}
                    onChangeText={setNewProdSale}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>سعر التكلفة (₪)</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.onSurfaceVariant}
                    keyboardType="numeric"
                    value={newProdCost}
                    onChangeText={setNewProdCost}
                  />
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>الرصيد المتاح في المخزن</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="50"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="numeric"
                value={newProdStock}
                onChangeText={setNewProdStock}
              />

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
  methodFilterRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 2 },
  methodFilterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  methodFilterText: { fontSize: 11, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  topActionsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sumBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  sumBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic' },
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  exportAllBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
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
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  details: { gap: 2, flex: 1 },
  invNum: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  badgeContainer: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  custName: { fontSize: 12, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  dateText: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  leftInfo: { alignItems: 'flex-start', gap: 2 },
  totalAmount: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  debtText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  paidText: { fontSize: 10, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  cardBtnRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 4 },
  miniActionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'IBM Plex Sans Arabic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '90%' },
  quickModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  sectionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  quickAddBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  quickAddBtnText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  inputBox: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, textAlign: 'right', fontSize: 13, fontFamily: 'IBM Plex Sans Arabic' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 6 },
  chipText: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  autocompleteInputBox: { height: 44, borderRadius: 10, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  autoInput: { flex: 1, textAlign: 'right', fontSize: 12, fontFamily: 'IBM Plex Sans Arabic' },
  suggestionsBox: { borderRadius: 10, borderWidth: 1, maxHeight: 160, marginVertical: 4, overflow: 'hidden' },
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
  miniInput: { width: 50, height: 32, borderRadius: 6, borderWidth: 1, textAlign: 'center', fontSize: 12, fontFamily: 'IBM Plex Sans Arabic' },
  methodRow: { flexDirection: 'row-reverse', gap: 8 },
  methodChip: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  methodChipText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  sumTotalBox: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4, gap: 4 },
  sumLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  sumValue: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  saveBtn: { height: 46, borderRadius: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 15 },
  saveBtnText: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  infoVal: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  sectionHeading: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', marginTop: 8, textAlign: 'right' },
  itemCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1 },
  itemName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  itemQty: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  itemTotal: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 12, marginBottom: 20 },
  actionBtnModal: { flex: 1, height: 46, borderRadius: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnModalText: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
});
