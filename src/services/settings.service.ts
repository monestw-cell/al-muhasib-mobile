import { queryFirst, executeSql, wipeAllData } from '../db/database';

export interface ShopInfo {
  store_name: string;
  phone: string;
  address: string;
  logo_path?: string;
  tax_number?: string;
  cr_number?: string;
  receipt_footer?: string;
  pdf_theme_color?: string;
  show_signature?: number;
  signature_title?: string;
}

export const SettingsService = {
  getShopInfo: async (): Promise<ShopInfo> => {
    const info = await queryFirst<ShopInfo>('SELECT * FROM shop_info WHERE id = 1');
    return (
      info || {
        store_name: 'متجري',
        phone: '050-000-0000',
        address: 'الشارع الرئيسي',
        receipt_footer: 'شكراً لزيارتكم وصحتين وعافية!',
        pdf_theme_color: '#00685f',
        show_signature: 1,
        signature_title: 'توقيع وختم المحل',
        tax_number: '',
        cr_number: '',
      }
    );
  },

  updateShopInfo: async (info: Partial<ShopInfo>): Promise<void> => {
    await executeSql(
      `UPDATE shop_info SET
        store_name = COALESCE(?, store_name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        logo_path = COALESCE(?, logo_path),
        tax_number = COALESCE(?, tax_number),
        cr_number = COALESCE(?, cr_number),
        receipt_footer = COALESCE(?, receipt_footer),
        pdf_theme_color = COALESCE(?, pdf_theme_color),
        show_signature = COALESCE(?, show_signature),
        signature_title = COALESCE(?, signature_title)
       WHERE id = 1`,
      [
        info.store_name ?? null,
        info.phone ?? null,
        info.address ?? null,
        info.logo_path ?? null,
        info.tax_number ?? null,
        info.cr_number ?? null,
        info.receipt_footer ?? null,
        info.pdf_theme_color ?? null,
        info.show_signature !== undefined ? info.show_signature : null,
        info.signature_title ?? null,
      ]
    );
  },

  wipeAllDatabaseData: async (): Promise<void> => {
    await wipeAllData();
  },
};
