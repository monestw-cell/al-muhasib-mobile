import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Header } from '../components/Header';
import { ReportsService, FinancialSummaryKPIs, InventoryAuditItem, ProductProfitItem } from '../services/reports.service';
import { AccountsService, TrialBalanceItem } from '../services/accounts.service';
import { PdfExportService } from '../services/pdf-export.service';
import { formatCurrency } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface ReportsScreenProps {
  onBack?: () => void;
}

type DateFilterType = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'trial_balance' | 'inventory_audit' | 'profits'>('overview');

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Data States
  const [kpis, setKpis] = useState<FinancialSummaryKPIs | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [inventoryAudit, setInventoryAudit] = useState<InventoryAuditItem[]>([]);
  const [productProfits, setProductProfits] = useState<ProductProfitItem[]>([]);

  useEffect(() => {
    loadData();
  }, [dateFilter, customFrom, customTo]);

  const getDateRangeParams = () => {
    const now = new Date();
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (dateFilter === 'today') {
      dateFrom = now.toISOString().split('T')[0];
      dateTo = dateFrom;
    } else if (dateFilter === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateFrom = yest.toISOString().split('T')[0];
      dateTo = dateFrom;
    } else if (dateFilter === 'last_7_days') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom = d.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    } else if (dateFilter === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for week start
      const monday = new Date(now.setDate(diff));
      dateFrom = monday.toISOString().split('T')[0];
      dateTo = new Date().toISOString().split('T')[0];
    } else if (dateFilter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFrom = start.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    } else if (dateFilter === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFrom = start.toISOString().split('T')[0];
      dateTo = end.toISOString().split('T')[0];
    } else if (dateFilter === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      dateFrom = start.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    } else if (dateFilter === 'custom') {
      dateFrom = customFrom || undefined;
      dateTo = customTo || undefined;
    }

    return { dateFrom, dateTo };
  };

  const loadData = async () => {
    const { dateFrom, dateTo } = getDateRangeParams();

    const kpiData = await ReportsService.getFinancialSummary(dateFrom, dateTo);
    setKpis(kpiData);
    const topProdData = await ReportsService.getTopSellingProducts(10, dateFrom, dateTo);
    setTopProducts(topProdData);
    const payData = await ReportsService.getPaymentMethodBreakdown(dateFrom, dateTo);
    setPaymentBreakdown(payData);
    const tbData = await AccountsService.getTrialBalance();
    setTrialBalance(tbData);
    const auditData = await ReportsService.getInventoryAudit();
    setInventoryAudit(auditData);
    const profitsData = await ReportsService.getProductProfitability(dateFrom, dateTo);
    setProductProfits(profitsData);
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'اليوم';
      case 'yesterday': return 'الأمس';
      case 'last_7_days': return 'آخر 7 أيام';
      case 'this_week': return 'هذا الأسبوع';
      case 'this_month': return 'هذا الشهر';
      case 'last_month': return 'الشهر الماضي';
      case 'this_year': return 'هذه السنة';
      case 'custom': return `نطاق مخصص (${customFrom || 'من البداية'} إلى ${customTo || 'الآن'})`;
      default: return 'كل الفترات';
    }
  };

  const exportCurrentPDF = async () => {
    try {
      const filterLabel = getDateFilterLabel();
      if (activeReportTab === 'overview' && kpis) {
        await PdfExportService.exportFinancialReportPDF(kpis, topProducts, paymentBreakdown, filterLabel);
      } else if (activeReportTab === 'trial_balance') {
        await PdfExportService.exportTrialBalancePDF(trialBalance);
      } else if (activeReportTab === 'inventory_audit') {
        await PdfExportService.exportInventoryAuditPDF(inventoryAudit);
      } else if (activeReportTab === 'profits') {
        await PdfExportService.exportProductProfitsPDF(productProfits);
      }
    } catch (err: any) {
      Alert.alert('خطأ', 'فشل تصدير التقرير كـ PDF');
    }
  };

  const exportCurrentExcel = async () => {
    try {
      const bom = '\uFEFF';
      let csvData = '';
      let fileName = 'Report';

      if (activeReportTab === 'trial_balance') {
        fileName = 'Trial_Balance';
        csvData = `${bom}رقم الحساب,اسم الحساب,النوع,الرصيد المدين (₪),الرصيد الدائن (₪)\n`;
        trialBalance.forEach(a => {
          csvData += `${a.code},"${a.name}",${a.type},${a.net_debit_cents / 100},${a.net_credit_cents / 100}\n`;
        });
      } else if (activeReportTab === 'inventory_audit') {
        fileName = 'Inventory_Audit';
        csvData = `${bom}الباركود,اسم الصنف,الكمية,سعر التكلفة (₪),سعر البيع (₪),إجمالي التكلفة (₪),إجمالي القيمة البيعية (₪)\n`;
        inventoryAudit.forEach(i => {
          csvData += `${i.barcode},"${i.name}",${i.stock_quantity},${i.cost_price_cents / 100},${i.sale_price_cents / 100},${i.total_cost_val_cents / 100},${i.total_sale_val_cents / 100}\n`;
        });
      } else if (activeReportTab === 'profits') {
        fileName = 'Product_Profits';
        csvData = `${bom}اسم الصنف,الكمية المباعة,إجمالي الإيرادات (₪),إجمالي التكلفة (₪),صافي الربح (₪),نسبة الهامش %\n`;
        productProfits.forEach(p => {
          csvData += `"${p.product_name}",${p.total_qty_sold},${p.total_revenue_cents / 100},${p.total_cost_cents / 100},${p.net_profit_cents / 100},${p.profit_margin_pct}%\n`;
        });
      } else {
        fileName = 'Financial_Summary';
        csvData = `${bom}الفترة,${getDateFilterLabel()}\n` +
          `إجمالي المبيعات,${(kpis?.salesCents || 0) / 100}\n` +
          `مجمل الربح,${(kpis?.profitCents || 0) / 100}\n` +
          `إجمالي المشتريات,${(kpis?.purchasesCents || 0) / 100}\n` +
          `المصروفات التشغيلية,${(kpis?.expensesCents || 0) / 100}\n` +
          `صافي الدخل,${(kpis?.netIncomeCents || 0) / 100}\n` +
          `عدد الفواتير,${kpis?.invoicesCount || 0}\n` +
          `رصيد الصندوق,${(kpis?.cashBalanceCents || 0) / 100}\n` +
          `ديون العملاء,${(kpis?.customerDebtsCents || 0) / 100}\n` +
          `قيمة المخزون,${(kpis?.inventoryValuationCents || 0) / 100}\n`;
      }

      const path = `${FileSystem.documentDirectory}${fileName}_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, csvData, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv' });
      }
    } catch (err: any) {
      Alert.alert('خطأ في التصدير', err.message);
    }
  };

  const totalTbDebit = trialBalance.reduce((sum, t) => sum + t.net_debit_cents, 0);
  const totalTbCredit = trialBalance.reduce((sum, t) => sum + t.net_credit_cents, 0);
  const isTbBalanced = Math.abs(totalTbDebit - totalTbCredit) === 0;

  const totalInventoryCost = inventoryAudit.reduce((sum, i) => sum + i.total_cost_val_cents, 0);
  const totalInventorySale = inventoryAudit.reduce((sum, i) => sum + i.total_sale_val_cents, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="التقارير والقوائم المحاسبية" showBack={!!onBack} onBackPress={onBack} />

      {/* Main Sub-Tabs */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
          {[
            { key: 'overview', label: 'الملخص المالي', icon: 'chart-line' },
            { key: 'trial_balance', label: 'ميزان المراجعة', icon: 'scale-balance' },
            { key: 'inventory_audit', label: 'جرد المخزون', icon: 'cube-scan' },
            { key: 'profits', label: 'أرباح الأصناف', icon: 'trending-up' },
          ].map(tab => {
            const isSel = activeReportTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabPill,
                  isSel
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                ]}
                onPress={() => setActiveReportTab(tab.key as any)}
              >
                <MaterialCommunityIcons name={tab.icon as any} size={16} color={isSel ? theme.onPrimary : theme.onSurface} />
                <Text style={[styles.tabPillText, { color: isSel ? theme.onPrimary : theme.onSurface }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date Filter Bar (Applies to Overview & Profits) */}
        {(activeReportTab === 'overview' || activeReportTab === 'profits') && (
          <View style={styles.dateFilterContainer}>
            <Text style={[styles.filterHeading, { color: theme.onSurfaceVariant }]}>فلترة الفترة المحاسبية:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
              {[
                { key: 'all', label: 'الكل' },
                { key: 'today', label: 'اليوم' },
                { key: 'yesterday', label: 'الأمس' },
                { key: 'last_7_days', label: 'آخر 7 أيام' },
                { key: 'this_week', label: 'هذا الأسبوع' },
                { key: 'this_month', label: 'هذا الشهر' },
                { key: 'last_month', label: 'الشهر الماضي' },
                { key: 'this_year', label: 'هذه السنة' },
                { key: 'custom', label: 'نطاق مخصص' },
              ].map(f => {
                const isSel = dateFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.dateFilterChip,
                      isSel
                        ? { backgroundColor: theme.primary }
                        : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                    ]}
                    onPress={() => setDateFilter(f.key as any)}
                  >
                    <Text style={[styles.dateFilterText, { color: isSel ? theme.onPrimary : theme.onSurface }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {dateFilter === 'custom' && (
              <View style={styles.customDateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniInputLabel, { color: theme.onSurfaceVariant }]}>من تاريخ (YYYY-MM-DD):</Text>
                  <TextInput
                    style={[styles.customDateInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="2026-01-01"
                    placeholderTextColor={theme.onSurfaceVariant}
                    value={customFrom}
                    onChangeText={setCustomFrom}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniInputLabel, { color: theme.onSurfaceVariant }]}>إلى تاريخ (YYYY-MM-DD):</Text>
                  <TextInput
                    style={[styles.customDateInput, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                    placeholder="2026-12-31"
                    placeholderTextColor={theme.onSurfaceVariant}
                    value={customTo}
                    onChangeText={setCustomTo}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Global Export Row */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: theme.primary }]} onPress={exportCurrentPDF}>
            <MaterialCommunityIcons name="file-pdf-box" size={18} color={theme.onPrimary} />
            <Text style={[styles.exportBtnText, { color: theme.onPrimary }]}>تصدير PDF A4</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtnSecondary, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
            onPress={exportCurrentExcel}
          >
            <MaterialCommunityIcons name="file-excel-outline" size={18} color={theme.primary} />
            <Text style={[styles.exportBtnSecText, { color: theme.onSurface }]}>تصدير Excel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* TAB 1: OVERVIEW */}
        {activeReportTab === 'overview' && (
          <>
            <View style={[styles.activeFilterBadge, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.primary} />
              <Text style={[styles.activeFilterText, { color: theme.primary }]}>
                الفترة المحددة: {getDateFilterLabel()}
              </Text>
            </View>

            {/* Income & Performance Card */}
            <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>ملخص قائمة الدخل والأرباح</Text>
            <View style={[styles.reportCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
              <View style={styles.itemRow}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>إجمالي المبيعات للفترة:</Text>
                <Text style={[styles.val, { color: theme.primary }]}>{formatCurrency(kpis?.salesCents || 0)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>مجمل الربح المحقق (Gross Profit):</Text>
                <Text style={[styles.val, { color: '#059669' }]}>{formatCurrency(kpis?.profitCents || 0)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>إجمالي المشتريات والتوريد:</Text>
                <Text style={[styles.val, { color: theme.secondary }]}>{formatCurrency(kpis?.purchasesCents || 0)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>المصروفات التشغيلية:</Text>
                <Text style={[styles.val, { color: '#d97706' }]}>{formatCurrency(kpis?.expensesCents || 0)}</Text>
              </View>

              <View style={[styles.itemRow, styles.netIncomeRow, { backgroundColor: (kpis?.netIncomeCents || 0) >= 0 ? '#ecfdf5' : '#fef2f2' }]}>
                <Text style={[styles.netIncomeLabel, { color: (kpis?.netIncomeCents || 0) >= 0 ? '#065f46' : '#991b1b' }]}>
                  صافي الدخل النهائي (Net Income):
                </Text>
                <Text style={[styles.netIncomeVal, { color: (kpis?.netIncomeCents || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                  {formatCurrency(kpis?.netIncomeCents || 0)}
                </Text>
              </View>
            </View>

            {/* Assets & Balances Card */}
            <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>الأرصدة والموجودات</Text>
            <View style={[styles.reportCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
              <View style={styles.itemRow}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>القيمة الكلية للمخزون:</Text>
                <Text style={[styles.val, { color: theme.primary }]}>{formatCurrency(kpis?.inventoryValuationCents || 0)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>ديون العملاء (الذمم المدينة):</Text>
                <Text style={[styles.val, { color: theme.error }]}>{formatCurrency(kpis?.customerDebtsCents || 0)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>عدد الفواتير المنجزة:</Text>
                <Text style={[styles.val, { color: theme.onSurface }]}>{kpis?.invoicesCount || 0}</Text>
              </View>
            </View>

            {/* Top Products */}
            <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>الأصناف الأكثر طلباً ومبيعاً بالفترة</Text>
            <View style={[styles.reportCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
              {topProducts.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>لا توجد مبيعات مسجلة في هذه الفترة</Text>
              ) : (
                topProducts.map((prod: any, idx: number) => (
                  <View key={idx} style={[styles.topProdRow, idx < topProducts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.outlineVariant }]}>
                    <View style={styles.topProdRight}>
                      <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? '#ffb703' : `${theme.primary}20` }]}>
                        <Text style={[styles.rankText, { color: idx === 0 ? '#000000' : theme.primary }]}>#{idx + 1}</Text>
                      </View>
                      <View style={{ gap: 2 }}>
                        <Text style={[styles.topProdName, { color: theme.onSurface }]}>{prod.product_name}</Text>
                        <Text style={[styles.topProdQty, { color: theme.onSurfaceVariant }]}>الكمية المباعة: {prod.total_qty}</Text>
                      </View>
                    </View>
                    <Text style={[styles.topProdTotal, { color: theme.primary }]}>{formatCurrency(prod.total_sales_cents)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* TAB 2: TRIAL BALANCE */}
        {activeReportTab === 'trial_balance' && (
          <>
            <View style={[styles.balanceStatusCard, { backgroundColor: isTbBalanced ? '#ecfdf5' : '#fef2f2', borderColor: isTbBalanced ? '#10b981' : '#ef4444' }]}>
              <MaterialCommunityIcons name={isTbBalanced ? 'check-circle' : 'alert-circle'} size={20} color={isTbBalanced ? '#059669' : '#dc2626'} />
              <Text style={[styles.balanceStatusText, { color: isTbBalanced ? '#065f46' : '#991b1b' }]}>
                {isTbBalanced ? 'ميزان المراجعة متوازن ومضبوط بنسبة 100%' : 'تنبيه: يوجد فارق محاسبي في توازن الميزان'}
              </Text>
            </View>

            <View style={[styles.reportCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
              <View style={styles.tbHeaderRow}>
                <Text style={[styles.tbHeadCell, { flex: 2, textAlign: 'right', color: theme.onSurfaceVariant }]}>الحساب</Text>
                <Text style={[styles.tbHeadCell, { flex: 1, textAlign: 'left', color: theme.primary }]}>مدين (Debit)</Text>
                <Text style={[styles.tbHeadCell, { flex: 1, textAlign: 'left', color: theme.error }]}>دائن (Credit)</Text>
              </View>

              {trialBalance.map(acc => (
                <View key={acc.account_id} style={[styles.tbRow, { borderBottomColor: theme.outlineVariant }]}>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.tbAccName, { color: theme.onSurface }]}>{acc.name}</Text>
                    <Text style={[styles.tbAccCode, { color: theme.onSurfaceVariant }]}>كود: {acc.code}</Text>
                  </View>
                  <Text style={[styles.tbValDebit, { color: acc.net_debit_cents > 0 ? theme.primary : theme.onSurfaceVariant }]}>
                    {acc.net_debit_cents > 0 ? formatCurrency(acc.net_debit_cents) : '-'}
                  </Text>
                  <Text style={[styles.tbValCredit, { color: acc.net_credit_cents > 0 ? theme.error : theme.onSurfaceVariant }]}>
                    {acc.net_credit_cents > 0 ? formatCurrency(acc.net_credit_cents) : '-'}
                  </Text>
                </View>
              ))}

              <View style={[styles.tbTotalRow, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
                <Text style={[styles.tbTotalLabel, { color: theme.onSurface }]}>المجموع:</Text>
                <Text style={[styles.tbTotalVal, { color: theme.primary }]}>{formatCurrency(totalTbDebit)}</Text>
                <Text style={[styles.tbTotalVal, { color: theme.error }]}>{formatCurrency(totalTbCredit)}</Text>
              </View>
            </View>
          </>
        )}

        {/* TAB 3: INVENTORY AUDIT */}
        {activeReportTab === 'inventory_audit' && (
          <>
            <View style={[styles.summaryKpiRow, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.kpiMiniLabel, { color: theme.onSurfaceVariant }]}>قيمة التكلفة (رأس المال):</Text>
                <Text style={[styles.kpiMiniVal, { color: theme.primary }]}>{formatCurrency(totalInventoryCost)}</Text>
              </View>
              <View style={{ width: 1, height: '70%', backgroundColor: theme.outlineVariant }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.kpiMiniLabel, { color: theme.onSurfaceVariant }]}>القيمة البيعية المتوقعة:</Text>
                <Text style={[styles.kpiMiniVal, { color: theme.secondary }]}>{formatCurrency(totalInventorySale)}</Text>
              </View>
            </View>

            <View style={[styles.reportCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
              {inventoryAudit.map(item => (
                <View key={item.id} style={[styles.auditRow, { borderBottomColor: theme.outlineVariant }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.auditName, { color: theme.onSurface }]}>{item.name}</Text>
                    <Text style={[styles.auditSub, { color: theme.onSurfaceVariant }]}>
                      الكمية: {item.stock_quantity} {item.unit} • تكلفة: {formatCurrency(item.cost_price_cents)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-start', gap: 2 }}>
                    <Text style={[styles.auditVal, { color: theme.primary }]}>{formatCurrency(item.total_cost_val_cents)}</Text>
                    <Text style={[styles.auditSaleVal, { color: theme.onSurfaceVariant }]}>بيعي: {formatCurrency(item.total_sale_val_cents)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* TAB 4: PRODUCT PROFITABILITY */}
        {activeReportTab === 'profits' && (
          <View style={[styles.reportCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.surfaceVariant }]}>
            {productProfits.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>لا توجد بيانات أرباح مسجلة في هذه الفترة</Text>
            ) : (
              productProfits.map((item, idx) => (
                <View key={idx} style={[styles.profitRow, { borderBottomColor: theme.outlineVariant }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.profitName, { color: theme.onSurface }]}>{item.product_name}</Text>
                    <Text style={[styles.profitSub, { color: theme.onSurfaceVariant }]}>
                      مباع: {item.total_qty_sold} • إيراد: {formatCurrency(item.total_revenue_cents)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-start', gap: 2 }}>
                    <Text style={[styles.profitVal, { color: '#059669' }]}>+ {formatCurrency(item.net_profit_cents)}</Text>
                    <View style={[styles.marginBadge, { backgroundColor: '#ecfdf5' }]}>
                      <Text style={styles.marginText}>{item.profit_margin_pct}% هامش</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, marginLeft: 8 },
  tabPillText: { fontSize: 12, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic' },
  dateFilterContainer: { marginTop: 10, gap: 6 },
  filterHeading: { fontSize: 11, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  dateFilterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 6 },
  dateFilterText: { fontSize: 11, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  customDateRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  miniInputLabel: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginBottom: 2 },
  customDateInput: { height: 36, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, fontSize: 11, textAlign: 'center', fontFamily: 'IBM Plex Sans Arabic' },
  activeFilterBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, borderWidth: 1 },
  activeFilterText: { fontSize: 12, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic' },
  exportRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  exportBtn: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  exportBtnText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  exportBtnSecondary: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  exportBtnSecText: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  content: { padding: 12, gap: 12, paddingBottom: 80 },
  sectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginTop: 4 },
  reportCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  itemRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  netIncomeRow: { padding: 8, borderRadius: 8, marginTop: 4 },
  netIncomeLabel: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  netIncomeVal: { fontSize: 16, fontWeight: '900', fontFamily: 'IBM Plex Sans Arabic' },
  label: { fontSize: 13, fontWeight: '500', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  val: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  emptyText: { textAlign: 'center', padding: 12, fontSize: 13, fontFamily: 'IBM Plex Sans Arabic' },
  topProdRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  topProdRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  topProdName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  topProdQty: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  topProdTotal: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  balanceStatusCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  balanceStatusText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  tbHeaderRow: { flexDirection: 'row-reverse', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 6 },
  tbHeadCell: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  tbRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  tbAccName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  tbAccCode: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  tbValDebit: { flex: 1, fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'left' },
  tbValCredit: { flex: 1, fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'left' },
  tbTotalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  tbTotalLabel: { flex: 2, fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  tbTotalVal: { flex: 1, fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'left' },
  summaryKpiRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  kpiMiniLabel: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic' },
  kpiMiniVal: { fontSize: 15, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', marginTop: 2 },
  auditRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  auditName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  auditSub: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  auditVal: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  auditSaleVal: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic' },
  profitRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  profitName: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  profitSub: { fontSize: 11, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  profitVal: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  marginBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  marginText: { fontSize: 10, color: '#065f46', fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
});
