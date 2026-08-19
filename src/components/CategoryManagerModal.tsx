import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ProductsService, Category } from '../services/products.service';

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoryChanged: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  visible,
  onClose,
  onCategoryChanged,
}) => {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    const data = await ProductsService.getCategories();
    setCategories(data);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم التصنيف');
      return;
    }

    try {
      if (editingCategory) {
        await ProductsService.updateCategory(editingCategory.id, categoryName.trim());
      } else {
        await ProductsService.addCategory(categoryName.trim());
      }
      setCategoryName('');
      setEditingCategory(null);
      await loadCategories();
      onCategoryChanged();
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'حدث خطأ أثناء حفظ التصنيف');
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('تأكيد الحذف', `هل أنت تأكد من حذف التصنيف "${cat.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await ProductsService.deleteCategory(cat.id);
          await loadCategories();
          onCategoryChanged();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.onSurface }]}>إدارة وتعديل التصانيف</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Add / Edit Input Bar */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.onSurfaceVariant }]}>
              {editingCategory ? `تعديل اسم التصنيف (${editingCategory.name}):` : 'إضافة تصنيف جديد:'}
            </Text>
            <View style={styles.inputRow}>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.onSurface }]}
                  placeholder="اسم التصنيف..."
                  placeholderTextColor={theme.onSurfaceVariant}
                  value={categoryName}
                  onChangeText={setCategoryName}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSave}
              >
                <MaterialCommunityIcons
                  name={editingCategory ? 'check' : 'plus'}
                  size={22}
                  color={theme.onPrimary}
                />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>
                  {editingCategory ? 'حفظ' : 'إضافة'}
                </Text>
              </TouchableOpacity>

              {editingCategory && (
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.outlineVariant }]}
                  onPress={handleCancelEdit}
                >
                  <MaterialCommunityIcons name="close" size={20} color={theme.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Categories List */}
          <FlatList
            data={categories}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.catItem,
                  { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
                ]}
              >
                <View style={styles.catLeft}>
                  <MaterialCommunityIcons name="label-outline" size={20} color={theme.primary} />
                  <Text style={[styles.catName, { color: theme.onSurface }]}>{item.name}</Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleStartEdit(item)}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
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
    maxHeight: '85%',
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
  inputSection: {
    gap: 6,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  inputRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  inputBox: {
    flex: 1,
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
  saveBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  cancelBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 8,
    paddingBottom: 20,
  },
  catItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  catLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  catName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
});
