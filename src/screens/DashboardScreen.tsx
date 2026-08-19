import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { KPICard } from '../components/KPICard';
import { ReportsService, DashboardKPIs } from '../services/reports.service';
import { ProductsService, Product } from '../services/products.service';
import { formatCurrency } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface DashboardScreenProps {
  onNavigate: (tab: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { theme } = useTheme();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const data = await ReportsService.getDashboardKPIs();
    setKpis(data);

    const lowStock = await ProductsService.getLowStock();
    setLowStockProducts(lowStock);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="لوحة التحكم الرئيسية" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Active Bar */}
        <View style={[styles.overviewCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
          <View style={styles.overviewRight}>
            <View style={[styles.overviewIcon, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="store-outline" size={24} color={theme.primary} />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={[styles.storeHeading, { color: theme.onSurface }]}>نظام نقاط البيع والمحاسبة</Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.shiftStatusText, { color: theme.onSurfaceVariant }]}>الوردية نشطة ومفتوحة</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.quickPosBtn, { backgroundColor: theme.primary }]} onPress={() => onNavigate('pos')}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color={theme.onPrimary} />
            <Text style={[styles.quickPosText, { color: theme.onPrimary }]}>بيع سريع</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>نظرة عامة على الأداء اليومي</Text>

        {/* Horizontal Scrolling KPI Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
          <KPICard
            title="مبيعات اليوم"
            value={formatCurrency(kpis?.todaySalesCents || 0)}
            iconName="cash-register"
            bgColor={`${theme.primary}20`}
            iconColor={theme.primary}
          />
          <KPICard
            title="أرباح اليوم"
            value={formatCurrency(kpis?.todayProfitCents || 0)}
            iconName="trending-up"
            bgColor={`${theme.tertiary}20`}
            iconColor={theme.tertiary}
          />
          <KPICard
            title="عدد الفواتير"
            value={(kpis?.todayInvoicesCount || 0).toString()}
            iconName="file-document-outline"
            bgColor={`${theme.secondary}20`}
            iconColor={theme.secondary}
          />
          <KPICard
            title="رصيد الصندوق"
            value={formatCurrency(kpis?.cashBalanceCents || 0)}
            iconName="wallet-outline"
            bgColor={`${theme.primaryFixed}30`}
            iconColor={theme.primary}
          />
          <KPICard
            title="ديون العملاء"
            value={formatCurrency(kpis?.customerDebtsCents || 0)}
            iconName="account-cash-outline"
            bgColor={`${theme.error}20`}
            iconColor={theme.error}
          />
          <KPICard
            title="قيمة المخزون"
            value={formatCurrency(kpis?.inventoryValuationCents || 0)}
            iconName="cube-outline"
            bgColor={`${theme.inversePrimary}30`}
            iconColor={theme.primary}
          />
        </ScrollView>

        {/* Quick Action Grid */}
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>الوصول السريع للعمليات</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={() => onNavigate('pos')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="calculator-variant" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.onSurface }]}>نقطة البيع</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={() => onNavigate('sales')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="receipt" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.onSurface }]}>سجل المبيعات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={() => onNavigate('purchases')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.onSurface }]}>فواتير الشراء</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={() => onNavigate('products')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="cube-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.onSurface }]}>إدارة المنتجات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={() => onNavigate('suppliers')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.onSurface }]}>الموردون</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={() => onNavigate('customers')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: `${theme.primary}15` }]}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.onSurface }]}>العملاء والديون</Text>
          </TouchableOpacity>
        </View>

        {/* Low Stock Alerts */}
        <View style={[styles.alertCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
          <View style={[styles.alertHeader, { backgroundColor: `${theme.error}15` }]}>
            <View style={styles.alertHeaderTitle}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color={theme.error} />
              <Text style={[styles.alertTitle, { color: theme.error }]}>تنبيهات المخزون المنخفض</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.error }]}>
              <Text style={styles.badgeText}>{lowStockProducts.length} عناصر</Text>
            </View>
          </View>

          {lowStockProducts.length === 0 ? (
            <Text style={[styles.emptyAlert, { color: theme.onSurfaceVariant }]}>جميع المنتجات بكميات ممتازة 👌</Text>
          ) : (
            lowStockProducts.slice(0, 4).map(p => (
              <View key={p.id} style={[styles.alertRow, { borderBottomColor: theme.surfaceVariant }]}>
                <View style={styles.alertRowInfo}>
                  <View style={[styles.iconBox, { backgroundColor: theme.surfaceContainer }]}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color={theme.onSurfaceVariant} />
                  </View>
                  <View>
                    <Text style={[styles.alertItemName, { color: theme.onSurface }]}>{p.name}</Text>
                    <Text style={[styles.alertItemSub, { color: theme.error }]}>
                      {p.stock_quantity === 0 ? 'نفذت الكمية!' : `متبقي ${p.stock_quantity} ${p.unit || 'حبة'} فقط`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addCartIconBtn, { backgroundColor: `${theme.primary}15` }]}
                  onPress={() => onNavigate('products')}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Developer Signature Badge */}
        <View style={[styles.devBadgeCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: `${theme.primary}30` }]}>
          <MaterialCommunityIcons name="shield-account-outline" size={22} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.devBadgeTitle, { color: theme.onSurface }]}>المحاسب الحنيوك الذكي</Text>
            <Text style={[styles.devBadgeSubtitle, { color: theme.onSurfaceVariant }]}>
              برمجة وتطوير المطور: <Text style={{ color: theme.primary, fontWeight: 'bold' }}>مؤنس الطويل</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => onNavigate('pos')}
      >
        <MaterialCommunityIcons name="calculator" size={28} color={theme.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 16,
  },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  overviewRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shiftStatusText: {
    fontSize: 12,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  quickPosBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
  },
  quickPosText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
    marginTop: 4,
    textAlign: 'right',
  },
  kpiScroll: {
    flexDirection: 'row-reverse',
  },
  actionGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: '31%',
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 1,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'center',
  },
  alertCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  alertHeaderTitle: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyAlert: {
    padding: 16,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  alertRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  alertRowInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  alertItemSub: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  addCartIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  devBadgeCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  devBadgeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
  devBadgeSubtitle: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
});
