import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ProductsService, Product } from '../services/products.service';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBarcode: (barcode: string, existingProduct?: Product | null) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onSelectBarcode,
}) => {
  const { theme } = useTheme();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) return;
    setLoading(true);
    setSearched(true);
    try {
      const prod = await ProductsService.getByBarcode(code);
      setFoundProduct(prod);
    } catch (e) {
      setFoundProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNew = () => {
    const randomCode = '628' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setBarcodeInput(randomCode);
    handleSearch(randomCode);
  };

  const handleConfirm = () => {
    if (!barcodeInput.trim()) return;
    onSelectBarcode(barcodeInput.trim(), foundProduct);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.onSurface }]}>ماسح وباحث الباركود</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
              أدخل رقم الباركود أو استخدم الماسح الضوئي:
            </Text>

            <View style={styles.inputRow}>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
                ]}
              >
                <MaterialCommunityIcons name="barcode-scan" size={22} color={theme.primary} />
                <TextInput
                  style={[styles.input, { color: theme.onSurface }]}
                  placeholder="رقم الباركود..."
                  placeholderTextColor={theme.onSurfaceVariant}
                  value={barcodeInput}
                  onChangeText={txt => {
                    setBarcodeInput(txt);
                    setSearched(false);
                  }}
                  keyboardType="numeric"
                  onSubmitEditing={() => handleSearch()}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleSearch()}
              >
                <MaterialCommunityIcons name="magnify" size={22} color={theme.onPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.genBtn, { borderColor: theme.primary }]}
              onPress={handleGenerateNew}
            >
              <MaterialCommunityIcons name="cached" size={20} color={theme.primary} />
              <Text style={[styles.genBtnText, { color: theme.primary }]}>توليد باركود تلقائي جديد</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 12 }} />}

            {searched && !loading && (
              <View style={styles.resultBox}>
                {foundProduct ? (
                  <View style={[styles.foundCard, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
                    <MaterialCommunityIcons name="check-circle-outline" size={24} color={theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.foundTitle, { color: theme.primary }]}>تم العثور على منتج مسجل!</Text>
                      <Text style={[styles.foundName, { color: theme.onSurface }]}>{foundProduct.name}</Text>
                      <Text style={[styles.foundSub, { color: theme.onSurfaceVariant }]}>
                        السعر: {foundProduct.sale_price_cents / 100} ₪ | الكمية: {foundProduct.stock_quantity}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.foundCard, { backgroundColor: `${theme.error}10`, borderColor: theme.error }]}>
                    <MaterialCommunityIcons name="information-outline" size={24} color={theme.error} />
                    <Text style={[styles.notFoundText, { color: theme.error }]}>
                      هذا الباركود غير مسجل مسبقاً (جاهز للإضافة جديدة)
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: barcodeInput.trim() ? theme.primary : theme.outlineVariant },
              ]}
              disabled={!barcodeInput.trim()}
              onPress={handleConfirm}
            >
              <Text style={[styles.confirmBtnText, { color: theme.onPrimary }]}>
                اعتماد الباركود ({barcodeInput || '...'})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    gap: 14,
  },
  label: {
    fontSize: 14,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  inputRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  inputBox: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: 16,
    textAlign: 'right',
  },
  searchBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  resultBox: {
    marginTop: 4,
  },
  foundCard: {
    flexDirection: 'row-reverse',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  foundTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  foundName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  foundSub: {
    fontSize: 12,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  notFoundText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
