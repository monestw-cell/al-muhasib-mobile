import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { SaleRecord } from '../services/sales.service';
import { PrintingService } from '../services/printing.service';
import { SettingsService, ShopInfo } from '../services/settings.service';
import { PdfExportService } from '../services/pdf-export.service';
import { formatCurrency } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';

interface ReceiptScreenProps {
  sale: SaleRecord;
  onBack: () => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ sale, onBack }) => {
  const { theme } = useTheme();
  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    store_name: 'المحاسب الحنيوك',
    phone: '050-000-0000',
    address: 'الشارع الرئيسي',
    receipt_footer: 'شكراً لزيارتكم!',
  });

  useEffect(() => {
    SettingsService.getShopInfo().then(info => {
      if (info) setShopInfo(info);
    });
  }, []);

  const handlePrint = async () => {
    await PrintingService.printReceipt(
      sale,
      shopInfo.store_name,
      shopInfo.phone,
      shopInfo.address,
      shopInfo.receipt_footer || 'شكراً لزيارتكم!'
    );
  };

  const handleShare = async () => {
    await PrintingService.shareReceiptPdf(
      sale,
      shopInfo.store_name,
      shopInfo.phone,
      shopInfo.address,
      shopInfo.receipt_footer || 'شكراً لزيارتكم!'
    );
  };

  const qrPayload = JSON.stringify({
    store: shopInfo.store_name,
    invoice: sale.invoice_number,
    date: sale.sale_date,
    total: sale.total_cents / 100,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title={`إيصال ${sale.invoice_number}`} showBack onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Thermal Paper Style Card */}
        <View style={styles.receiptContainer}>
          <View style={styles.thermalCard}>
            {/* Store Header */}
            <Text style={styles.storeName}>{shopInfo.store_name}</Text>
            <Text style={styles.storeInfo}>العنوان: {shopInfo.address}</Text>
            <Text style={styles.storeInfo}>الهاتف: {shopInfo.phone}</Text>

            <View style={styles.dashedLine} />

            {/* Invoice Meta */}
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{sale.invoice_number}</Text>
              <Text style={styles.metaLabel}>رقم الفاتورة:</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{new Date(sale.sale_date).toLocaleString('ar-EG')}</Text>
              <Text style={styles.metaLabel}>التاريخ:</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{sale.cashier_name || 'الكاشير'}</Text>
              <Text style={styles.metaLabel}>الكاشير:</Text>
            </View>

            <View style={styles.dashedLine} />

            {/* Items Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.col, { flex: 2, textAlign: 'right' }]}>الصنف</Text>
              <Text style={[styles.col, { flex: 1, textAlign: 'center' }]}>كمية</Text>
              <Text style={[styles.col, { flex: 1, textAlign: 'left' }]}>السعر</Text>
              <Text style={[styles.col, { flex: 1, textAlign: 'left' }]}>إجمالي</Text>
            </View>

            <View style={styles.dashedLine} />

            {/* Items List */}
            {(sale.items || []).map(item => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.col, { flex: 2, textAlign: 'right' }]}>{item.product_name}</Text>
                <Text style={[styles.col, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
                <Text style={[styles.col, { flex: 1, textAlign: 'left' }]}>{(item.unit_price_cents / 100).toFixed(2)}</Text>
                <Text style={[styles.col, { flex: 1, textAlign: 'left' }]}>{(item.line_total_cents / 100).toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.dashedLine} />

            {/* Totals */}
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{formatCurrency(sale.subtotal_cents)}</Text>
              <Text style={styles.metaLabel}>المجموع الفرعي:</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{formatCurrency(sale.discount_cents)}</Text>
              <Text style={styles.metaLabel}>الخصم:</Text>
            </View>

            <View style={styles.solidLine} />

            <View style={styles.metaRow}>
              <Text style={styles.totalValue}>{formatCurrency(sale.total_cents)}</Text>
              <Text style={styles.totalLabel}>الإجمالي النهائي:</Text>
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{formatCurrency(sale.paid_cents)}</Text>
              <Text style={styles.metaLabel}>المدفوع:</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaValue}>{formatCurrency(Math.abs(sale.remaining_cents))}</Text>
              <Text style={styles.metaLabel}>الباقي:</Text>
            </View>

            <View style={styles.dashedLine} />

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <QRCode value={qrPayload} size={110} />
            </View>

            <Text style={styles.footerNote}>{shopInfo.receipt_footer || 'شكراً لزيارتكم!'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: theme.surface, borderTopColor: theme.surfaceVariant }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          onPress={() => PdfExportService.exportSaleInvoicePDF(sale)}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={20} color={theme.onPrimary} />
          <Text style={[styles.actionText, { color: theme.onPrimary }]}>فاتورة PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.secondary }]} onPress={handlePrint}>
          <MaterialCommunityIcons name="printer" size={20} color={theme.onSecondary} />
          <Text style={[styles.actionText, { color: theme.onSecondary }]}>طباعة حرارية</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceContainer }]} onPress={handleShare}>
          <MaterialCommunityIcons name="share-variant" size={20} color={theme.onSurface} />
          <Text style={[styles.actionText, { color: theme.onSurface }]}>مشاركة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    alignItems: 'center',
  },
  receiptContainer: {
    width: '100%',
    maxWidth: 360,
  },
  thermalCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 3,
  },
  storeName: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#000000',
  },
  storeInfo: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666666',
  },
  dashedLine: {
    borderWidth: 0.5,
    borderColor: '#666666',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  solidLine: {
    borderWidth: 1,
    borderColor: '#000000',
    marginVertical: 8,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#333333',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  col: {
    fontSize: 12,
    color: '#000000',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    elevation: 8,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
});
