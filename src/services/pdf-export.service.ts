import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SettingsService } from './settings.service';
import { SaleRecord } from './sales.service';
import { PurchaseRecord } from './purchases.service';
import { FinancialSummaryKPIs, InventoryAuditItem, ProductProfitItem } from './reports.service';
import { TrialBalanceItem } from './accounts.service';
import { formatCurrency } from '../utils/currency';

export const PdfExportService = {
  /**
   * Generates a modern, beautiful A4 Tax Invoice PDF for a single sale.
   */
  exportSaleInvoicePDF: async (sale: SaleRecord): Promise<void> => {
    const shop = await SettingsService.getShopInfo();
    const primaryColor = shop.pdf_theme_color || '#00685f';

    const itemsRows = (sale.items || [])
      .map(
        (it, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${it.product_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${formatCurrency(it.unit_price_cents)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: ${primaryColor};">${formatCurrency(it.line_total_cents)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 13px; }
          .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
          .store-name { font-size: 24px; font-weight: 800; color: ${primaryColor}; margin: 0 0 4px 0; }
          .store-sub { color: #64748b; font-size: 12px; margin: 2px 0; }
          .invoice-badge { background-color: ${primaryColor}; color: #ffffff; padding: 8px 18px; border-radius: 8px; text-align: center; }
          .invoice-title { font-size: 18px; font-weight: bold; margin: 0; }
          .invoice-number { font-size: 14px; opacity: 0.9; margin-top: 3px; }
          .meta-grid { display: flex; justify-content: space-between; background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
          .meta-item { font-size: 12px; }
          .meta-label { color: #64748b; margin-bottom: 2px; }
          .meta-value { font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: ${primaryColor}; color: #ffffff; padding: 10px; font-size: 13px; text-align: right; }
          .summary-section { display: flex; justify-content: flex-end; margin-top: 10px; }
          .summary-table { width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          .summary-row.total { background-color: ${primaryColor}; color: #ffffff; font-weight: bold; font-size: 16px; border-bottom: none; }
          .signature-box { margin-top: 40px; display: flex; justify-content: space-between; }
          .sign-line { width: 200px; text-align: center; border-top: 1px dashed #94a3b8; padding-top: 8px; font-size: 12px; color: #475569; }
          .footer-note { margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            ${shop.logo_path ? `<img src="${shop.logo_path}" style="height: 50px; margin-bottom: 5px;" />` : ''}
            <h1 class="store-name">${shop.store_name}</h1>
            <p class="store-sub">${shop.address || 'العنوان الرئيسي'} • هاتف: ${shop.phone || '050-000-0000'}</p>
            ${shop.tax_number ? `<p class="store-sub">الرقم الضريبي: ${shop.tax_number}</p>` : ''}
            ${shop.cr_number ? `<p class="store-sub">السجل التجاري: ${shop.cr_number}</p>` : ''}
          </div>
          <div class="invoice-badge">
            <h2 class="invoice-title">فاتورة مبيعات ضريبية</h2>
            <div class="invoice-number">${sale.invoice_number}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><div class="meta-label">العميل الكريم:</div><div class="meta-value">${sale.customer_name || 'عميل نقدي'}</div></div>
          <div class="meta-item"><div class="meta-label">تاريخ الفاتورة:</div><div class="meta-value">${new Date(sale.sale_date).toLocaleDateString('ar-EG')} - ${new Date(sale.sale_date).toLocaleTimeString('ar-EG')}</div></div>
          <div class="meta-item"><div class="meta-label">المحاسب / الكاشير:</div><div class="meta-value">${sale.cashier_name || 'مدير النظام'}</div></div>
          <div class="meta-item"><div class="meta-label">طريقة الدفع:</div><div class="meta-value">${sale.payment_method === 'cash' ? 'نقدي' : sale.payment_method === 'card' ? 'شبكة / بطاقة' : 'آجل (ذمم)'}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>بيان الصنف / الخدمة</th>
              <th style="width: 70px; text-align: center;">الكمية</th>
              <th style="width: 90px; text-align: center;">سعر الوحدة</th>
              <th style="width: 100px; text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <div class="summary-section">
          <div class="summary-table">
            <div class="summary-row"><span>المجموع الفرعي:</span><span>${formatCurrency(sale.subtotal_cents)}</span></div>
            ${sale.discount_cents > 0 ? `<div class="summary-row" style="color: #e11d48;"><span>الخصم:</span><span>-${formatCurrency(sale.discount_cents)}</span></div>` : ''}
            <div class="summary-row total"><span>المبلغ الإجمالي:</span><span>${formatCurrency(sale.total_cents)}</span></div>
            <div class="summary-row"><span>المدفوع:</span><span>${formatCurrency(sale.paid_cents)}</span></div>
            ${sale.remaining_cents > 0 ? `<div class="summary-row" style="color: #dc2626; font-weight: bold;"><span>المتبقي دين:</span><span>${formatCurrency(sale.remaining_cents)}</span></div>` : ''}
          </div>
        </div>

        ${shop.show_signature ? `<div class="signature-box"><div class="sign-line">${shop.signature_title || 'توقيع وختم المحل'}</div><div class="sign-line">توقيع المستلم / العميل</div></div>` : ''}
        <div class="footer-note">
          <p>${shop.receipt_footer || 'شكراً لزيارتكم وصحتين وعافية!'}</p>
          <p style="font-size: 10px; color: #94a3b8; margin-top: 4px;">نظام المحاسب الحنيوك • برمجة وتطوير المطور: <b>مؤنس الطويل</b></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  },

  /**
   * Generates Trial Balance (ميزان المراجعة) PDF
   */
  exportTrialBalancePDF: async (trialBalance: TrialBalanceItem[]): Promise<void> => {
    const shop = await SettingsService.getShopInfo();
    const primaryColor = shop.pdf_theme_color || '#00685f';

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = trialBalance
      .map((acc, idx) => {
        totalDebit += acc.net_debit_cents;
        totalCredit += acc.net_credit_cents;
        return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: center;">${acc.code}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${acc.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${acc.type === 'asset' ? 'أصول' : acc.type === 'liability' ? 'خصوم' : acc.type === 'equity' ? 'ملكية' : acc.type === 'revenue' ? 'إيرادات' : 'مصروفات'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; color: ${acc.net_debit_cents > 0 ? primaryColor : '#64748b'}; font-weight: bold;">${acc.net_debit_cents > 0 ? formatCurrency(acc.net_debit_cents) : '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; color: ${acc.net_credit_cents > 0 ? '#dc2626' : '#64748b'}; font-weight: bold;">${acc.net_credit_cents > 0 ? formatCurrency(acc.net_credit_cents) : '-'}</td>
        </tr>
      `;
      })
      .join('');

    const isBalanced = totalDebit === totalCredit;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; font-size: 12px; }
          .header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          h1 { color: ${primaryColor}; margin: 0; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: ${primaryColor}; color: white; padding: 8px; text-align: right; font-size: 12px; }
          .total-row { background-color: #f1f5f9; font-weight: bold; font-size: 13px; }
          .balance-badge { margin-top: 15px; padding: 10px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${shop.store_name}</h1>
            <p style="margin: 3px 0; color: #64748b;">ميزان المراجعة بالأرصدة (Trial Balance)</p>
          </div>
          <div><p style="margin: 0; color: #64748b;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">رقم الحساب</th>
              <th>اسم الحساب</th>
              <th style="text-align: center;">النوع</th>
              <th style="text-align: left;">الرصيد المدين (Debit)</th>
              <th style="text-align: left;">الرصيد الدائن (Credit)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="3" style="padding: 10px; text-align: right;">المجموع الإجمالي:</td>
              <td style="padding: 10px; text-align: left; color: ${primaryColor};">${formatCurrency(totalDebit)}</td>
              <td style="padding: 10px; text-align: left; color: #dc2626;">${formatCurrency(totalCredit)}</td>
            </tr>
          </tbody>
        </table>

        <div class="balance-badge" style="background-color: ${isBalanced ? '#ecfdf5' : '#fef2f2'}; color: ${isBalanced ? '#065f46' : '#991b1b'};">
          ${isBalanced ? '✓ ميزان المراجعة متوازن محاسبياً 100% (إجمالي المدين = إجمالي الدائن)' : '⚠ تنبيه: يوجد فارق في توازن الميزان'}
        </div>

        <div class="footer-note" style="margin-top: 30px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <p>نظام المحاسب الحنيوك • برمجة وتطوير المطور: <b>مؤنس الطويل</b></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  },

  /**
   * Inventory Audit PDF
   */
  exportInventoryAuditPDF: async (auditItems: InventoryAuditItem[]): Promise<void> => {
    const shop = await SettingsService.getShopInfo();
    const primaryColor = shop.pdf_theme_color || '#00685f';

    let totalCostVal = 0;
    let totalSaleVal = 0;

    const rows = auditItems
      .map((it, idx) => {
        totalCostVal += it.total_cost_val_cents;
        totalSaleVal += it.total_sale_val_cents;
        return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${it.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.stock_quantity} ${it.unit}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${formatCurrency(it.cost_price_cents)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: ${primaryColor};">${formatCurrency(it.total_cost_val_cents)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: bold;">${formatCurrency(it.total_sale_val_cents)}</td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; font-size: 12px; }
          .header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          h1 { color: ${primaryColor}; margin: 0; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: ${primaryColor}; color: white; padding: 8px; text-align: right; font-size: 12px; }
          .total-box { margin-top: 15px; padding: 12px; background-color: #f1f5f9; border-radius: 8px; font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${shop.store_name}</h1>
            <p style="margin: 3px 0; color: #64748b;">تقرير جرد وتقييم بضاعة المخزون</p>
          </div>
          <div><p style="margin: 0; color: #64748b;">تاريخ الجرد: ${new Date().toLocaleDateString('ar-EG')}</p></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>اسم الصنف</th>
              <th style="text-align: center;">الكمية المتوفرة</th>
              <th style="text-align: center;">سعر التكلفة</th>
              <th style="text-align: left;">إجمالي قيمة التكلفة</th>
              <th style="text-align: left;">إجمالي القيمة البيعية</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="total-box">
          إجمالي رأس مال المخزون (بالتكلفة): <span style="color: ${primaryColor};">${formatCurrency(totalCostVal)}</span> | 
          القيمة البيعية المتوقعة: <span>${formatCurrency(totalSaleVal)}</span> | 
          الربح المتوقع للمخزون: <span style="color: #059669;">${formatCurrency(totalSaleVal - totalCostVal)}</span>
        </div>

        <div class="footer-note" style="margin-top: 30px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <p>نظام المحاسب الحنيوك • برمجة وتطوير المطور: <b>مؤنس الطويل</b></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  },

  /**
   * Product Profitability PDF
   */
  exportProductProfitsPDF: async (profits: ProductProfitItem[]): Promise<void> => {
    const shop = await SettingsService.getShopInfo();
    const primaryColor = shop.pdf_theme_color || '#00685f';

    let grandRevenue = 0;
    let grandProfit = 0;

    const rows = profits
      .map((p, idx) => {
        grandRevenue += p.total_revenue_cents;
        grandProfit += p.net_profit_cents;
        return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${p.product_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.total_qty_sold}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left;">${formatCurrency(p.total_revenue_cents)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; color: #059669; font-weight: bold;">${formatCurrency(p.net_profit_cents)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${p.profit_margin_pct}%</td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; font-size: 12px; }
          .header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          h1 { color: ${primaryColor}; margin: 0; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: ${primaryColor}; color: white; padding: 8px; text-align: right; font-size: 12px; }
          .total-box { margin-top: 15px; padding: 12px; background-color: #f1f5f9; border-radius: 8px; font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${shop.store_name}</h1>
            <p style="margin: 3px 0; color: #64748b;">تقرير أرباح الأصناف وهوامش الربحية</p>
          </div>
          <div><p style="margin: 0; color: #64748b;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>اسم الصنف</th>
              <th style="text-align: center;">الكمية المباعة</th>
              <th style="text-align: left;">إجمالي الإيرادات</th>
              <th style="text-align: left;">صافي الربح المحقق</th>
              <th style="text-align: center;">نسبة الهامش %</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="total-box">
          إجمالي الإيرادات: <span>${formatCurrency(grandRevenue)}</span> | 
          صافي الأرباح الإجمالية: <span style="color: #059669;">${formatCurrency(grandProfit)}</span>
        </div>

        <div class="footer-note" style="margin-top: 30px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <p>نظام المحاسب الحنيوك • برمجة وتطوير المطور: <b>مؤنس الطويل</b></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  },

  exportSalesListPDF: async (sales: SaleRecord[]): Promise<void> => {
    const shop = await SettingsService.getShopInfo();
    const primaryColor = shop.pdf_theme_color || '#00685f';
    const totalAmount = sales.reduce((sum, s) => sum + s.total_cents, 0);

    const rows = sales
      .map(
        (s, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${s.invoice_number}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${s.customer_name || 'عميل نقدي'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${new Date(s.sale_date).toLocaleDateString('ar-EG')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${s.payment_method === 'cash' ? 'نقدي' : s.payment_method === 'card' ? 'شبكة' : 'آجل'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: ${primaryColor};">${formatCurrency(s.total_cents)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; font-size: 12px; }
          .header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          h1 { color: ${primaryColor}; margin: 0; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: ${primaryColor}; color: white; padding: 8px; text-align: right; font-size: 12px; }
          .total-box { margin-top: 15px; text-align: left; font-size: 15px; font-weight: bold; color: ${primaryColor}; padding: 10px; background-color: #f1f5f9; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${shop.store_name}</h1>
            <p style="margin: 3px 0; color: #64748b;">تقرير سجل فواتير المبيعات</p>
          </div>
          <div><p style="margin: 0; color: #64748b;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>رقم الفاتورة</th>
              <th>اسم العميل</th>
              <th style="text-align: center;">التاريخ</th>
              <th style="text-align: center;">طريقة الدفع</th>
              <th style="text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="total-box">
          إجمالي المبيعات (${sales.length} فواتير): ${formatCurrency(totalAmount)}
        </div>

        <div class="footer-note" style="margin-top: 30px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <p>نظام المحاسب الحنيوك • برمجة وتطوير المطور: <b>مؤنس الطويل</b></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  },

  exportPurchaseInvoicePDF: async (purchase: PurchaseRecord): Promise<void> => {
    const shop = await SettingsService.getShopInfo();
    const primaryColor = shop.pdf_theme_color || '#00685f';

    const itemsRows = (purchase.items || [])
      .map(
        (it: any, idx: number) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${it.product_name || 'صنف'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${formatCurrency(it.unit_cost_cents)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: ${primaryColor};">${formatCurrency(it.line_total_cents)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; font-size: 13px; }
          .header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          h1 { color: ${primaryColor}; margin: 0; }
          .meta { background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: ${primaryColor}; color: white; padding: 10px; text-align: right; }
          .total-box { margin-top: 15px; text-align: left; font-size: 16px; font-weight: bold; color: ${primaryColor}; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${shop.store_name}</h1>
            <p style="margin: 3px 0; color: #64748b;">فاتورة شراء واستلام بضاعة</p>
          </div>
          <div style="background-color: ${primaryColor}; color: white; padding: 6px 14px; border-radius: 6px; font-weight: bold;">${purchase.purchase_number}</div>
        </div>

        <div class="meta">
          <div><strong>المورد:</strong> ${purchase.supplier_name || 'مورد عام'}</div>
          <div><strong>التاريخ:</strong> ${new Date(purchase.purchase_date).toLocaleDateString('ar-EG')}</div>
          <div><strong>الحالة:</strong> ${purchase.status === 'completed' ? 'معتمدة ومستلمة' : purchase.status}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>اسم الصنف / البضاعة</th>
              <th style="width: 70px; text-align: center;">الكمية</th>
              <th style="width: 90px; text-align: center;">سعر التكلفة</th>
              <th style="width: 100px; text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <div class="total-box">
          إجمالي الفاتورة: ${formatCurrency(purchase.total_cents)} | المدفوع: ${formatCurrency(purchase.paid_cents)} | المتبقي: ${formatCurrency(purchase.remaining_cents)}
        </div>

        <div class="footer-note" style="margin-top: 30px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <p>نظام المحاسب الحنيوك • برمجة وتطوير المطور: <b>مؤنس الطويل</b></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  },

  exportFinancialReportPDF: async (kpis: FinancialSummaryKPIs, topProducts: any[], paymentBreakdown: any[], dateRangeTitle: string = 'كل الفترات'): Promise<void> => {
    const shop = await SettingsService.getShopInfo();
    const primaryColor = shop.pdf_theme_color || '#00685f';

    const topProdRows = (topProducts || [])
      .map(
        (p, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">#${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${p.product_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.total_qty}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: ${primaryColor};">${formatCurrency(p.total_sales_cents)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 0; font-size: 13px; }
          .header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          h1 { color: ${primaryColor}; margin: 0; font-size: 22px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background-color: #f8fafc; }
          .kpi-label { color: #64748b; font-size: 11px; margin-bottom: 4px; }
          .kpi-val { font-size: 18px; font-weight: bold; color: ${primaryColor}; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 20px; }
          th { background-color: ${primaryColor}; color: white; padding: 8px; text-align: right; }
          h2 { font-size: 15px; color: #0f172a; margin-top: 15px; margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${shop.store_name}</h1>
            <p style="margin: 3px 0; color: #64748b;">التقرير المالي الشامل (${dateRangeTitle})</p>
          </div>
          <div><p style="margin: 0; color: #64748b;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p></div>
        </div>

        <h2>المؤشرات المالية للفترة المحددة</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-label">إجمالي المبيعات</div><div class="kpi-val">${formatCurrency(kpis.salesCents)}</div></div>
          <div class="kpi-card"><div class="kpi-label">مجمل الربح من المبيعات</div><div class="kpi-val" style="color: #059669;">${formatCurrency(kpis.profitCents)}</div></div>
          <div class="kpi-card"><div class="kpi-label">إجمالي المشتريات والتوريد</div><div class="kpi-val">${formatCurrency(kpis.purchasesCents)}</div></div>
          <div class="kpi-card"><div class="kpi-label">المصروفات التشغيلية</div><div class="kpi-val" style="color: #d97706;">${formatCurrency(kpis.expensesCents)}</div></div>
          <div class="kpi-card"><div class="kpi-label">صافي الدخل النهائي</div><div class="kpi-val" style="color: ${kpis.netIncomeCents >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(kpis.netIncomeCents)}</div></div>
          <div class="kpi-card"><div class="kpi-label">القيمة الكلية للمخزون</div><div class="kpi-val">${formatCurrency(kpis.inventoryValuationCents)}</div></div>
          <div class="kpi-card"><div class="kpi-label">ديون العملاء (الذمم)</div><div class="kpi-val" style="color: #dc2626;">${formatCurrency(kpis.customerDebtsCents)}</div></div>
          <div class="kpi-card"><div class="kpi-label">عدد فواتير المبيعات</div><div class="kpi-val">${kpis.invoicesCount}</div></div>
        </div>

        <h2>المنتجات الأكثر مبيعاً في هذه الفترة</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">الترتيب</th>
              <th>اسم الصنف</th>
              <th style="width: 80px; text-align: center;">الكمية المباعة</th>
              <th style="width: 120px; text-align: left;">إجمالي الإيراد</th>
            </tr>
          </thead>
          <tbody>
            ${topProdRows || '<tr><td colspan="4" style="text-align: center; padding: 10px;">لا توجد بيانات</td></tr>'}
          </tbody>
        </table>

        <div class="footer-note" style="margin-top: 30px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          <p>نظام المحاسب الحنيوك • برمجة وتطوير المطور: <b>مؤنس الطويل</b></p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  },
};
