import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Product } from '../services/products.service';
import { formatCurrency } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface ProductCardProps {
  product: Product;
  cartQuantity: number;
  onAdd: () => void;
  onDecrease: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQuantity,
  onAdd,
  onDecrease,
}) => {
  const { theme } = useTheme();
  const isLowStock = product.stock_quantity <= product.min_stock_quantity;
  const isInCart = cartQuantity > 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: isInCart ? theme.primary : theme.outlineVariant,
          borderWidth: isInCart ? 2 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.stockBadge,
            { backgroundColor: isLowStock ? `${theme.error}15` : `${theme.primary}15` },
          ]}
        >
          <Text style={[styles.stockText, { color: isLowStock ? theme.error : theme.primary }]}>
            {isLowStock ? `باقي ${product.stock_quantity}` : `متوفر: ${product.stock_quantity}`}
          </Text>
        </View>

        {isInCart ? (
          <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.cartBadgeText}>{cartQuantity}</Text>
          </View>
        ) : (
          <MaterialCommunityIcons name="cube-outline" size={18} color={theme.secondary} style={{ opacity: 0.5 }} />
        )}
      </View>

      <Text style={[styles.title, { color: theme.onSurface }]} numberOfLines={2}>
        {product.name}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={[styles.price, { color: theme.primary }]}>
          {formatCurrency(product.sale_price_cents)}
        </Text>

        {isInCart ? (
          <View style={[styles.qtyRow, { backgroundColor: theme.surfaceContainer }]}>
            <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease}>
              <MaterialCommunityIcons name="minus" size={16} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: theme.onSurface }]}>{cartQuantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={onAdd}>
              <MaterialCommunityIcons name="plus" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={onAdd}>
            <MaterialCommunityIcons name="plus" size={20} color={theme.onPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 155,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
    elevation: 2,
    margin: 4,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  cartBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
    marginVertical: 4,
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    height: 32,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    marginHorizontal: 4,
    fontWeight: 'bold',
    fontSize: 13,
  },
});
