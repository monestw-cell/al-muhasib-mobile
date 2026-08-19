import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProductCard } from '../components/ProductCard';
import { CartSheet } from '../components/CartSheet';
import { PaymentModal } from '../components/PaymentModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ProductsService, Product, Category } from '../services/products.service';
import { CustomersService, Customer } from '../services/customers.service';
import { SalesService, SaleRecord } from '../services/sales.service';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../utils/currency';
import { PrintingService } from '../services/printing.service';
import { useTheme } from '../theme/ThemeContext';

interface POSScreenProps {
  onSaleComplete: (sale: SaleRecord) => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({ onSaleComplete }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { items, customer, setCustomer, addItem, decreaseItem, getItemsCount, getTotal, clearCart } =
    useCartStore();

  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [cartSheetVisible, setCartSheetVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [heldModalVisible, setHeldModalVisible] = useState(false);
  const [heldSales, setHeldSales] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [showAddCust, setShowAddCust] = useState(false);

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadCustomers();
    loadHeldSales();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [search, selectedCatId]);

  const loadCategories = async () => {
    const cats = await ProductsService.getCategories();
    setCategories(cats);
  };

  const loadProducts = async () => {
    const prods = await ProductsService.getAll(search, selectedCatId);
    setProducts(prods);
  };

  const loadCustomers = async () => {
    const custs = await CustomersService.getAll(customerSearch);
    setCustomersList(custs);
  };

  const loadHeldSales = async () => {
    const held = await SalesService.getHeldSales();
    setHeldSales(held);
  };

  useEffect(() => {
    loadCustomers();
  }, [customerSearch]);

  const handleHoldCart = async () => {
    if (items.length === 0) {
      Alert.alert('تنبيه', 'السلة فارغة!');
      return;
    }
    const note = `فاتورة معلقة (${items.length} أصناف) - ${new Date().toLocaleTimeString('ar-EG')}`;
    await SalesService.holdSale(note, items, customer?.id, user?.id);
    clearCart();
    setCartSheetVisible(false);
    await loadHeldSales();
    Alert.alert('تم التعليق', 'تم حفظ الفاتورة في قائمة الفواتير المعلقة بنجاح');
  };

  const handleResumeSale = async (heldSale: any) => {
    try {
      const payload = JSON.parse(heldSale.payload_json);
      clearCart();
      if (payload.cartItems && Array.isArray(payload.cartItems)) {
        payload.cartItems.forEach((item: any) => {
          for (let i = 0; i < item.quantity; i++) {
            addItem({
              id: item.product_id,
              barcode: item.barcode,
              name: item.name,
              category_id: 1,
              unit: 'حبة',
              cost_price_cents: 0,
              sale_price_cents: item.unit_price_cents,
              stock_quantity: 999,
              min_stock_quantity: 0,
              active: 1,
            });
          }
        });
      }
      if (payload.customerId) {
        const cust = await CustomersService.getById(payload.customerId);
        if (cust) setCustomer(cust);
      }
      await SalesService.deleteHeldSale(heldSale.id);
      await loadHeldSales();
      setHeldModalVisible(false);
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل استرجاع الفاتورة');
    }
  };

  const handleDeleteHeldSale = async (id: number) => {
    await SalesService.deleteHeldSale(id);
    await loadHeldSales();
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العميل');
      return;
    }
    const newId = await CustomersService.add({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      credit_limit_cents: 100000,
    });
    setNewCustName('');
    setNewCustPhone('');
    setShowAddCust(false);
    const updatedCusts = await CustomersService.getAll();
    setCustomersList(updatedCusts);
    const added = updatedCusts.find(c => c.id === newId);
    if (added) {
      setCustomer(added);
      setCustomerModalVisible(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const success = addItem(product);
    if (!success) {
      Alert.alert('تنبيه المخزون', `الكمية المتوفرة من (${product.name}) هي (${product.stock_quantity}) فقط!`);
    }
  };

  // External Hardware Scanner Handler (Ends with Enter)
  const handleSearchSubmit = async () => {
    if (!search.trim()) return;
    const matched = await ProductsService.getByBarcode(search.trim());
    if (matched) {
      handleAddToCart(matched);
      setSearch('');
    }
  };

  const handlePayPress = (method: 'cash' | 'card' | 'credit') => {
    if (items.length === 0) {
      Alert.alert('تنبيه', 'السلة فارغة!');
      return;
    }
    setPaymentMethod(method);
    setCartSheetVisible(false);
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async (paidCents: number) => {
    if (!user) return;
    try {
      const sale = await SalesService.completeSale({
        customerId: customer?.id || 1,
        cashierId: user.id,
        items,
        subtotalCents: useCartStore.getState().getSubtotal(),
        discountCents: useCartStore.getState().discountCents,
        totalCents: getTotal(),
        paidCents: paymentMethod === 'cash' ? paidCents : getTotal(),
        paymentMethod,
      });

      setPaymentModalVisible(false);
      clearCart();
      
      // Auto Print / View Receipt
      onSaleComplete(sale);
    } catch (err: any) {
      Alert.alert('خطأ في العملية', err.message || 'حدث خطأ غير متوقع');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Search & Scanner Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
            ]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={theme.onSurfaceVariant} />
            <TextInput
              style={[styles.searchInput, { color: theme.onSurface }]}
              placeholder="البحث برقم الباركود أو الاسم..."
              placeholderTextColor={theme.onSurfaceVariant}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
            onPress={() => setScannerModalVisible(true)}
          >
            <MaterialCommunityIcons name="barcode-scan" size={22} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}
            onPress={() => setHeldModalVisible(true)}
          >
            <MaterialCommunityIcons name="pause-circle-outline" size={22} color={theme.primary} />
            {heldSales.length > 0 && (
              <View style={[styles.heldBadge, { backgroundColor: theme.error }]}>
                <Text style={styles.heldBadgeText}>{heldSales.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Selected Customer Selector */}
        <View style={styles.customerRow}>
          <TouchableOpacity
            style={styles.customerChip}
            onPress={() => setCustomerModalVisible(true)}
          >
            <MaterialCommunityIcons name="account-outline" size={18} color={theme.primary} />
            <Text style={[styles.customerText, { color: theme.primary }]}>
              {customer?.name || 'عميل نقدي (افتراضي)'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.primary} />
          </TouchableOpacity>

          {items.length > 0 && (
            <TouchableOpacity style={styles.holdBtn} onPress={handleHoldCart}>
              <MaterialCommunityIcons name="pause" size={16} color={theme.tertiary} />
              <Text style={[styles.holdBtnText, { color: theme.tertiary }]}>تعليق الفاتورة</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips Horizontal Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        <TouchableOpacity
          style={[
            styles.catChip,
            selectedCatId === undefined
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant, borderWidth: 1 },
          ]}
          onPress={() => setSelectedCatId(undefined)}
        >
          <Text
            style={[
              styles.catChipText,
              { color: selectedCatId === undefined ? theme.onPrimary : theme.onSurface },
            ]}
          >
            الكل
          </Text>
        </TouchableOpacity>

        {categories.map(cat => {
          const isSelected = selectedCatId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                isSelected
                  ? { backgroundColor: theme.primary }
                  : { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant, borderWidth: 1 },
              ]}
              onPress={() => setSelectedCatId(cat.id)}
            >
              <Text
                style={[
                  styles.catChipText,
                  { color: isSelected ? theme.onPrimary : theme.onSurface },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Product Grid */}
      <FlatList
        data={products}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item }) => {
          const cartItem = items.find(i => i.product_id === item.id);
          return (
            <ProductCard
              product={item}
              cartQuantity={cartItem?.quantity || 0}
              onAdd={() => handleAddToCart(item)}
              onDecrease={() => decreaseItem(item.id)}
            />
          );
        }}
      />

      {/* Persistent Bottom Cart Summary */}
      {items.length > 0 && (
        <View style={styles.bottomCartBar}>
          <TouchableOpacity
            style={[styles.cartSummaryBox, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={() => setCartSheetVisible(true)}
          >
            <View style={styles.cartInfo}>
              <View style={[styles.cartBadge, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialCommunityIcons name="cart-outline" size={22} color={theme.primary} />
                <View style={[styles.badgeCount, { backgroundColor: theme.error }]}>
                  <Text style={styles.badgeCountText}>{getItemsCount()}</Text>
                </View>
              </View>
              <View>
                <Text style={[styles.itemsSub, { color: theme.onSurfaceVariant }]}>{getItemsCount()} أصناف</Text>
                <Text style={[styles.totalAmount, { color: theme.onSurface }]}>{formatCurrency(getTotal())}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.payBarBtn, { backgroundColor: theme.primary }]}
              onPress={() => handlePayPress('cash')}
            >
              <Text style={[styles.payBarBtnText, { color: theme.onPrimary }]}>دفع</Text>
              <MaterialCommunityIcons name="arrow-left" size={20} color={theme.onPrimary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Sheet */}
      <CartSheet
        visible={cartSheetVisible}
        onClose={() => setCartSheetVisible(false)}
        onPayPress={handlePayPress}
      />

      {/* Payment Modal */}
      <PaymentModal
        visible={paymentModalVisible}
        totalCents={getTotal()}
        paymentMethod={paymentMethod}
        onClose={() => setPaymentModalVisible(false)}
        onConfirm={handleConfirmPayment}
      />

      {/* Barcode Scanner & Search Modal */}
      <BarcodeScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onSelectBarcode={(scannedCode, prod) => {
          if (prod) {
            handleAddToCart(prod);
          } else {
            setSearch(scannedCode);
          }
        }}
      />

      {/* Customer Selection Modal */}
      {customerModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>تحديد العميل</Text>
              <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={[styles.custSearchBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.onSurfaceVariant} />
              <TextInput
                style={[styles.custInput, { color: theme.onSurface }]}
                placeholder="ابحث باسم العميل أو الهاتف..."
                placeholderTextColor={theme.onSurfaceVariant}
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
            </View>

            <TouchableOpacity
              style={[styles.quickAddCustBtn, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
              onPress={() => setShowAddCust(!showAddCust)}
            >
              <MaterialCommunityIcons name={showAddCust ? 'chevron-up' : 'account-plus-outline'} size={18} color={theme.primary} />
              <Text style={[styles.quickAddText, { color: theme.primary }]}>
                {showAddCust ? 'إلغاء الإضافة السريعة' : '+ إضافة عميل جديد سريعاً'}
              </Text>
            </TouchableOpacity>

            {showAddCust && (
              <View style={[styles.addCustForm, { backgroundColor: theme.surfaceContainerLow }]}>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.surface, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                  placeholder="اسم العميل *"
                  placeholderTextColor={theme.onSurfaceVariant}
                  value={newCustName}
                  onChangeText={setNewCustName}
                />
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.surface, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                  placeholder="رقم الهاتف"
                  placeholderTextColor={theme.onSurfaceVariant}
                  keyboardType="phone-pad"
                  value={newCustPhone}
                  onChangeText={setNewCustPhone}
                />
                <TouchableOpacity style={[styles.saveCustBtn, { backgroundColor: theme.primary }]} onPress={handleQuickAddCustomer}>
                  <Text style={[styles.saveCustBtnText, { color: theme.onPrimary }]}>حفظ واختيار العميل</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={customersList}
              keyExtractor={item => item.id.toString()}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => {
                const isSelected = customer?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.custItem,
                      {
                        backgroundColor: isSelected ? `${theme.primary}15` : theme.surfaceContainerLowest,
                        borderColor: isSelected ? theme.primary : theme.surfaceVariant,
                      },
                    ]}
                    onPress={() => {
                      setCustomer(item);
                      setCustomerModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons
                        name={item.id === 1 ? 'cash' : 'account-outline'}
                        size={20}
                        color={isSelected ? theme.primary : theme.onSurfaceVariant}
                      />
                      <View>
                        <Text style={[styles.custName, { color: theme.onSurface }]}>{item.name}</Text>
                        {item.phone ? <Text style={[styles.custPhone, { color: theme.onSurfaceVariant }]}>{item.phone}</Text> : null}
                      </View>
                    </View>

                    {item.current_balance_cents > 0 && (
                      <Text style={[styles.custDebt, { color: theme.error }]}>
                        دين: {formatCurrency(item.current_balance_cents)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      )}

      {/* Held Sales Modal */}
      {heldModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>الفواتير المعلقة ({heldSales.length})</Text>
              <TouchableOpacity onPress={() => setHeldModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            {heldSales.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <MaterialCommunityIcons name="playlist-check" size={48} color={theme.outlineVariant} />
                <Text style={{ color: theme.onSurfaceVariant, marginTop: 8, fontFamily: 'IBM Plex Sans Arabic' }}>
                  لا توجد فواتير معلقة حالياً
                </Text>
              </View>
            ) : (
              <FlatList
                data={heldSales}
                keyExtractor={item => item.id.toString()}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <View style={[styles.heldItem, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.heldNote, { color: theme.onSurface }]}>{item.reference_note}</Text>
                      <Text style={[styles.heldDate, { color: theme.onSurfaceVariant }]}>
                        {new Date(item.created_at).toLocaleTimeString('ar-EG')}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.resumeBtn, { backgroundColor: theme.primary }]}
                        onPress={() => handleResumeSale(item)}
                      >
                        <Text style={[styles.resumeBtnText, { color: theme.onPrimary }]}>استرجاع</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.deleteHeldBtn, { backgroundColor: `${theme.error}15` }]}
                        onPress={() => handleDeleteHeldSale(item.id)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    padding: 12,
    gap: 8,
    elevation: 2,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  inputBox: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: 14,
    textAlign: 'right',
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  customerChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  customerText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  categoriesScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingBottom: 90,
  },
  bottomCartBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  cartSummaryBox: {
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
  },
  cartInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  cartBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemsSub: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  payBarBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payBarBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  heldBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heldBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  holdBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(146, 70, 40, 0.1)',
  },
  holdBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  custSearchBox: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  custInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: 13,
    textAlign: 'right',
  },
  quickAddCustBtn: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  addCustForm: {
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  formInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
  saveCustBtn: {
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCustBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  custItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  custName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  custPhone: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  custDebt: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  heldItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  heldNote: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  heldDate: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  resumeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resumeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  deleteHeldBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
