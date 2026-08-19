import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { ProductsService, Product, Category } from '../services/products.service';
import { SuppliersService } from '../services/suppliers.service';
import { shekelsToAgorot, agorotToShekels } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { CategoryManagerModal } from '../components/CategoryManagerModal';

interface ProductEditScreenProps {
  product?: Product | null;
  onBack: () => void;
}

export const ProductEditScreen: React.FC<ProductEditScreenProps> = ({ product, onBack }) => {
  const { theme } = useTheme();
  const isEditing = !!product;

  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [name, setName] = useState(product?.name || '');
  const [categoryId, setCategoryId] = useState<number>(product?.category_id || 1);
  const [unit, setUnit] = useState(product?.unit || 'حبة');
  const [costPrice, setCostPrice] = useState(product ? agorotToShekels(product.cost_price_cents).toString() : '');
  const [salePrice, setSalePrice] = useState(product ? agorotToShekels(product.sale_price_cents).toString() : '');
  const [stockQuantity, setStockQuantity] = useState(product ? product.stock_quantity.toString() : '0');
  const [minStock, setMinStock] = useState(product ? product.min_stock_quantity.toString() : '5');

  const [supplierId, setSupplierId] = useState<number | undefined>(product?.supplier_id || undefined);
  const [expiryDate, setExpiryDate] = useState(product?.expiry_date || '');
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  const loadCategories = async () => {
    const data = await ProductsService.getCategories();
    setCategories(data);
    if (data.length > 0 && !categoryId) {
      setCategoryId(data[0].id);
    }
  };

  const loadSuppliers = async () => {
    const sList = await SuppliersService.getAll();
    setSuppliers(sList);
  };

  const generateBarcode = () => {
    const randomBar = '628' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setBarcode(randomBar);
  };

  const handleBarcodeScanned = (scannedBarcode: string, existingProd?: Product | null) => {
    setBarcode(scannedBarcode);
    if (existingProd) {
      setName(existingProd.name);
      if (existingProd.category_id) setCategoryId(existingProd.category_id);
      if (existingProd.unit) setUnit(existingProd.unit);
      if (existingProd.supplier_id) setSupplierId(existingProd.supplier_id);
      if (existingProd.expiry_date) setExpiryDate(existingProd.expiry_date);
      setCostPrice(agorotToShekels(existingProd.cost_price_cents).toString());
      setSalePrice(agorotToShekels(existingProd.sale_price_cents).toString());
      setStockQuantity(existingProd.stock_quantity.toString());
      setMinStock(existingProd.min_stock_quantity.toString());
      Alert.alert('تم تحميل البيانات', `تم العثور على المنتج (${existingProd.name}) وتم تحميل بياناته للتعديل.`);
    }
  };

  const handleSave = async () => {
    if (!barcode.trim() || !name.trim() || !salePrice) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول الإلزامية (الباركود، الاسم، وسعر البيع)');
      return;
    }

    try {
      const productPayload = {
        barcode: barcode.trim(),
        name: name.trim(),
        category_id: categoryId,
        unit: unit.trim(),
        cost_price_cents: shekelsToAgorot(costPrice || '0'),
        sale_price_cents: shekelsToAgorot(salePrice),
        stock_quantity: parseInt(stockQuantity || '0', 10),
        min_stock_quantity: parseInt(minStock || '5', 10),
        supplier_id: supplierId,
        expiry_date: expiryDate.trim() || undefined,
      };

      if (isEditing && product) {
        await ProductsService.update(product.id, productPayload);
      } else {
        await ProductsService.add(productPayload);
      }

      onBack();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'فشل حفظ المنتج');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title={isEditing ? 'تعديل منتج' : 'إضافة منتج جديد'} showBack onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Barcode Field */}
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>الباركود *</Text>
        <View style={styles.barcodeRow}>
          <View
            style={[
              styles.inputBox,
              { flex: 1, backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.onSurface }]}
              placeholder="أدخل أو امسح الباركود"
              value={barcode}
              onChangeText={setBarcode}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
            onPress={() => setScannerModalVisible(true)}
          >
            <MaterialCommunityIcons name="barcode-scan" size={22} color={theme.primary} />
            <Text style={[styles.scanBtnText, { color: theme.primary }]}>ماسح / بحث</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.genBtn, { backgroundColor: theme.primary }]} onPress={generateBarcode}>
            <MaterialCommunityIcons name="cached" size={20} color={theme.onPrimary} />
            <Text style={[styles.genBtnText, { color: theme.onPrimary }]}>توليد</Text>
          </TouchableOpacity>
        </View>

        {/* Name Field */}
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>اسم المنتج *</Text>
        <View style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
          <TextInput
            style={[styles.input, { color: theme.onSurface }]}
            placeholder="مثال: جهاز إلكتروني أو قطعة غيار"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Category Field with Edit Option */}
        <View style={styles.catHeaderRow}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>التصنيف</Text>
          <TouchableOpacity style={styles.manageCatBtn} onPress={() => setCategoryModalVisible(true)}>
            <MaterialCommunityIcons name="pencil-box-outline" size={18} color={theme.primary} />
            <Text style={[styles.manageCatText, { color: theme.primary }]}>إدارة وتعديل التصانيف</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map(cat => {
            const isSelected = categoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catChip,
                  isSelected ? { backgroundColor: theme.primary } : { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant, borderWidth: 1 },
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={[styles.catChipText, { color: isSelected ? theme.onPrimary : theme.onSurface }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Unit & Stock */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>الوحدة</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
              <TextInput
                style={[styles.input, { color: theme.onSurface }]}
                placeholder="حبة / قطعة / خدمة"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>الكمية الحالية</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
              <TextInput
                style={[styles.input, { color: theme.onSurface }]}
                keyboardType="numeric"
                value={stockQuantity}
                onChangeText={setStockQuantity}
              />
            </View>
          </View>
        </View>

        {/* Prices */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>سعر التكلفة (₪)</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
              <TextInput
                style={[styles.input, { color: theme.onSurface }]}
                keyboardType="numeric"
                placeholder="0.00"
                value={costPrice}
                onChangeText={setCostPrice}
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>سعر البيع (₪) *</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
              <TextInput
                style={[styles.input, { color: theme.onSurface }]}
                keyboardType="numeric"
                placeholder="0.00"
                value={salePrice}
                onChangeText={setSalePrice}
              />
            </View>
          </View>
        </View>

        {/* Min Stock Alert */}
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>حد التنبيه للكمية المنخفضة</Text>
        <View style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
          <TextInput
            style={[styles.input, { color: theme.onSurface }]}
            keyboardType="numeric"
            value={minStock}
            onChangeText={setMinStock}
          />
        </View>

        {/* Supplier Selector */}
        {suppliers.length > 0 && (
          <>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>المورد المعتمد (اختياري)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <TouchableOpacity
                style={[
                  styles.catChip,
                  supplierId === undefined
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant, borderWidth: 1 },
                ]}
                onPress={() => setSupplierId(undefined)}
              >
                <Text style={[styles.catChipText, { color: supplierId === undefined ? theme.onPrimary : theme.onSurface }]}>
                  بدون مورد محدد
                </Text>
              </TouchableOpacity>
              {suppliers.map(s => {
                const isSelected = supplierId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.catChip,
                      isSelected
                        ? { backgroundColor: theme.primary }
                        : { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant, borderWidth: 1 },
                    ]}
                    onPress={() => setSupplierId(s.id)}
                  >
                    <Text style={[styles.catChipText, { color: isSelected ? theme.onPrimary : theme.onSurface }]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Expiry Date */}
        <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>تاريخ انتهاء الصلاحية (اختياري)</Text>
        <View style={[styles.inputBox, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
          <TextInput
            style={[styles.input, { color: theme.onSurface }]}
            placeholder="YYYY-MM-DD (مثال: 2026-12-31)"
            placeholderTextColor={theme.onSurfaceVariant}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
          <MaterialCommunityIcons name="content-save-outline" size={22} color={theme.onPrimary} />
          <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>
            {isEditing ? 'تحديث بيانات المنتج' : 'حفظ المنتج الجديد'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onSelectBarcode={handleBarcodeScanned}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onCategoryChanged={loadCategories}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
    marginTop: 4,
  },
  barcodeRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  inputBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: 15,
    textAlign: 'right',
  },
  scanBtn: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  genBtn: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  genBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  catHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  manageCatBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  manageCatText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  catScroll: {
    flexDirection: 'row-reverse',
    marginVertical: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
