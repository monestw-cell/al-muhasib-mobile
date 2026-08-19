import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { ProductsService, Product } from '../services/products.service';
import { formatCurrency } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import { CategoryManagerModal } from '../components/CategoryManagerModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface ProductsScreenProps {
  onAddProduct: () => void;
  onEditProduct: (p: Product) => void;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ onAddProduct, onEditProduct }) => {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [search]);

  const loadProducts = async () => {
    const data = await ProductsService.getAll(search);
    setProducts(data);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('تأكيد الحذف', `هل أنت تأكد من حذف المنتج: ${name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await ProductsService.delete(id);
          loadProducts();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="إدارة المنتجات والتصانيف" />

      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { flex: 1, backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.onSurfaceVariant} />
            <TextInput
              style={[styles.input, { color: theme.onSurface }]}
              placeholder="البحث بالاسم أو الباركود..."
              placeholderTextColor={theme.onSurfaceVariant}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}
            onPress={() => setScannerModalVisible(true)}
          >
            <MaterialCommunityIcons name="barcode-scan" size={22} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: theme.primary }]}
            onPress={() => setCategoryModalVisible(true)}
          >
            <MaterialCommunityIcons name="shape-outline" size={22} color={theme.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item }) => {
          const isLowStock = item.stock_quantity <= item.min_stock_quantity;
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}
              onPress={() => onEditProduct(item)}
            >
              <View style={styles.rightInfo}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.primary}15` }]}>
                  <MaterialCommunityIcons name="cube-outline" size={24} color={theme.primary} />
                </View>
                <View style={styles.details}>
                  <Text style={[styles.name, { color: theme.onSurface }]}>{item.name}</Text>
                  <Text style={[styles.barcode, { color: theme.onSurfaceVariant }]}>الباركود: {item.barcode}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.salePrice, { color: theme.primary }]}>{formatCurrency(item.sale_price_cents)}</Text>
                    <Text style={[styles.costPrice, { color: theme.onSurfaceVariant }]}>
                      (التكلفة: {formatCurrency(item.cost_price_cents)})
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.leftActions}>
                <View style={[styles.badge, { backgroundColor: isLowStock ? `${theme.error}15` : `${theme.primary}15` }]}>
                  <Text style={[styles.badgeText, { color: isLowStock ? theme.error : theme.primary }]}>
                    {item.stock_quantity} {item.unit}
                  </Text>
                </View>

                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={onAddProduct}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.onPrimary} />
      </TouchableOpacity>

      {/* Modals */}
      <CategoryManagerModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onCategoryChanged={loadProducts}
      />

      <BarcodeScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onSelectBarcode={(scannedCode, prod) => {
          if (prod) {
            onEditProduct(prod);
          } else {
            setSearch(scannedCode);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    padding: 12,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: 14,
    textAlign: 'right',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rightInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    gap: 2,
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  barcode: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  salePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  costPrice: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  leftActions: {
    alignItems: 'flex-start',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  deleteBtn: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
