import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SaleRecord } from './sales.service';
import { formatCurrency } from '../utils/currency';

export const PrintingService = {
  generateThermalHtml: (
    sale: SaleRecord,
    shopName: string = 'المحاسب الحنيوك',
    phone: string = '050-000-0000',
    address: string = 'الشارع الرئيسي',
    footer: string = 'شكراً لزيارتكم!'
  ): string => {
    const itemsHtml = (sale.items || [])
      .map(
        item => `
      <tr>
        <td style="text-align: right; padding: 4px 0;">${item.product_name}</td>
        <td style="text-align: center; padding: 4px 0;">${item.quantity}</td>
        <td style="text-align: left; padding: 4px 0;">${formatCurrency(item.unit_price_cents)}</td>
        <td style="text-align: left; padding: 4px 0;">${formatCurrency(item.line_total_cents)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            width: 78mm;
            margin: 0 auto;
            padding: 8px;
            font-family: 'IBM Plex Sans Arabic', sans-serif, monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
            direction: rtl;
            text-align: right;
          }
          .header { text-align: center; margin-bottom: 8px; }
          .store-title { font-size: 18px; font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          th { border-bottom: 1px dashed #000; padding: 4px 0; text-align: right; }
          .total-row { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .footer { text-align: center; margin-top: 12px; font-weight: bold; }
          .qr { text-align: center; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-title">${shopName}</div>
          <div>العنوان: ${address}</div>
          <div>الهاتف: ${phone}</div>
        </div>

        <div class="divider"></div>

        <div class="row"><span>رقم الفاتورة:</span><span>${sale.invoice_number}</span></div>
        <div class="row"><span>التاريخ:</span><span>${new Date(sale.sale_date).toLocaleString('ar-EG')}</span></div>
        <div class="row"><span>الكاشير:</span><span>${sale.cashier_name || 'الكاشير'}</span></div>
        <div class="row"><span>العميل:</span><span>${sale.customer_name || 'عميل نقدي'}</span></div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="width: 45%;">الصنف</th>
              <th style="width: 15%; text-align: center;">ك</th>
              <th style="width: 20%; text-align: left;">سعر</th>
              <th style="width: 20%; text-align: left;">إجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="row"><span>المجموع الفرعي:</span><span>${formatCurrency(sale.subtotal_cents)}</span></div>
        <div class="row"><span>الخصم:</span><span>${formatCurrency(sale.discount_cents)}</span></div>

        <div class="divider"></div>

        <div class="row total-row"><span>الإجمالي النهائي:</span><span>${formatCurrency(sale.total_cents)}</span></div>
        <div class="row"><span>المدفوع:</span><span>${formatCurrency(sale.paid_cents)}</span></div>
        <div class="row"><span>الباقي:</span><span>${formatCurrency(Math.abs(sale.remaining_cents))}</span></div>

        <div class="divider"></div>

        <div class="footer">
          <p>${footer}</p>
        </div>
      </body>
      </html>
    `;
  },

  printReceipt: async (
    sale: SaleRecord,
    shopName: string = 'المحاسب الحنيوك',
    phone: string = '050-000-0000',
    address: string = 'الشارع الرئيسي',
    footer: string = 'شكراً لزيارتكم!'
  ): Promise<void> => {
    const html = PrintingService.generateThermalHtml(sale, shopName, phone, address, footer);
    await Print.printAsync({ html });
  },

  shareReceiptPdf: async (
    sale: SaleRecord,
    shopName: string = 'المحاسب الحنيوك',
    phone: string = '050-000-0000',
    address: string = 'الشارع الرئيسي',
    footer: string = 'شكراً لزيارتكم!'
  ): Promise<void> => {
    const html = PrintingService.generateThermalHtml(sale, shopName, phone, address, footer);
    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  },
};
