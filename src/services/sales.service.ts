import { queryAll, queryFirst, executeSql } from '../db/database';

export interface CartItem {
  product_id: number;
  barcode: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
  discount_cents?: number;
}

export interface CompleteSaleParams {
  customerId?: number;
  cashierId: number;
  items: CartItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paidCents: number;
  paymentMethod: 'cash' | 'card' | 'credit' | 'mixed';
  note?: string;
  saleDate?: string;
}

export interface SaleRecord {
  id: number;
  invoice_number: string;
  customer_id?: number;
  customer_name?: string;
  cashier_id: number;
  cashier_name?: string;
  sale_date: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  paid_cents: number;
  remaining_cents: number;
  payment_method: string;
  status: string;
  note?: string;
  items?: SaleItemRecord[];
}

export interface SaleItemRecord {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  line_total_cents: number;
}

export interface HeldSale {
  id: number;
  reference_note: string;
  payload_json: string;
  created_by?: number;
  created_at: string;
}

export const SalesService = {
  generateInvoiceNumber: async (): Promise<string> => {
    const countRes = await queryFirst<{ count: number }>('SELECT COUNT(id) as count FROM sales');
    const nextId = (countRes?.count || 0) + 1;
    return `INV-${String(nextId).padStart(4, '0')}`;
  },

  completeSale: async (params: CompleteSaleParams): Promise<SaleRecord> => {
    const invoiceNumber = await SalesService.generateInvoiceNumber();
    const remainingCents = params.totalCents - params.paidCents;
    const finalDate = params.saleDate || new Date().toISOString();

    // 1. Strict Stock Validation before selling!
    for (const item of params.items) {
      const product = await queryFirst<{ stock_quantity: number; name: string }>(
        'SELECT stock_quantity, name FROM products WHERE id = ?',
        [item.product_id]
      );
      if (!product) {
        throw new Error(`الصنف (${item.name}) غير مسجل في النظام`);
      }
      if (product.stock_quantity < item.quantity) {
        throw new Error(`الكمية المتوفرة في المخزن من (${product.name}) هي (${product.stock_quantity}) فقط، لا يمكن بيع (${item.quantity})!`);
      }
    }

    // Validate customer ID
    let finalCustomerId = params.customerId || null;
    let customerName = 'عميل نقدي';
    if (finalCustomerId) {
      const validCust = await queryFirst<{ id: number; name: string }>('SELECT id, name FROM customers WHERE id = ?', [finalCustomerId]);
      if (validCust) {
        customerName = validCust.name;
      } else {
        const defaultCust = await queryFirst<{ id: number; name: string }>('SELECT id, name FROM customers ORDER BY id ASC LIMIT 1');
        finalCustomerId = defaultCust ? defaultCust.id : null;
        customerName = defaultCust?.name || 'عميل نقدي';
      }
    }

    // Validate cashier ID
    let finalCashierId = params.cashierId || null;
    if (finalCashierId) {
      const validUser = await queryFirst<{ id: number }>('SELECT id FROM users WHERE id = ?', [finalCashierId]);
      if (!validUser) {
        const defaultUser = await queryFirst<{ id: number }>('SELECT id FROM users ORDER BY id ASC LIMIT 1');
        finalCashierId = defaultUser ? defaultUser.id : null;
      }
    } else {
      const defaultUser = await queryFirst<{ id: number }>('SELECT id FROM users ORDER BY id ASC LIMIT 1');
      finalCashierId = defaultUser ? defaultUser.id : null;
    }

    // 2. Insert Sales
    const saleRes = await executeSql(
      `INSERT INTO sales (
        invoice_number, customer_id, cashier_id, sale_date, subtotal_cents, discount_cents, 
        total_cents, paid_cents, remaining_cents, payment_method, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        finalCustomerId,
        finalCashierId,
        finalDate,
        params.subtotalCents,
        params.discountCents,
        params.totalCents,
        params.paidCents,
        remainingCents,
        params.paymentMethod,
        params.note || null,
      ]
    );

    const saleId = Number(saleRes.insertId);

    // 3. Insert Items & Deduct Stock
    for (const item of params.items) {
      const lineTotal = item.unit_price_cents * item.quantity - (item.discount_cents || 0);

      await executeSql(
        `INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit_price_cents, discount_cents, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id,
          item.name,
          item.barcode,
          item.quantity,
          item.unit_price_cents,
          item.discount_cents || 0,
          lineTotal,
        ]
      );

      // Deduct Stock
      const product = await queryFirst<{ stock_quantity: number }>('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
      if (product) {
        const newStock = product.stock_quantity - item.quantity;
        await executeSql('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, item.product_id]);

        await executeSql(
          `INSERT INTO stock_movements (product_id, movement_type, quantity_change, balance_after, reference_type, reference_id, user_id, note, created_at)
           VALUES (?, 'sale', ?, ?, 'sale', ?, ?, ?, ?)`,
          [item.product_id, -item.quantity, newStock, saleId, finalCashierId, `فاتورة بيع ${invoiceNumber}`, finalDate]
        );
      }
    }

    // 4. Customer debt if credit or partial payment
    if (finalCustomerId && remainingCents > 0) {
      await executeSql(
        'UPDATE customers SET current_balance_cents = current_balance_cents + ? WHERE id = ?',
        [remainingCents, finalCustomerId]
      );
    }

    // 5. Record Cash Movement if cash paid
    if (params.paymentMethod === 'cash' || params.paymentMethod === 'mixed') {
      const cashReceived = Math.min(params.paidCents, params.totalCents);
      if (cashReceived > 0) {
        await executeSql(
          `INSERT INTO cash_movements (type, amount_cents, reason, reference_type, reference_id, user_id, created_at)
           VALUES ('sale', ?, ?, 'sale', ?, ?, ?)`,
          [cashReceived, `بيع فاتورة ${invoiceNumber}`, saleId, finalCashierId, finalDate]
        );

        // Update active shift cash
        await executeSql(
          `UPDATE shifts SET expected_cash_cents = expected_cash_cents + ? WHERE status = 'open'`,
          [cashReceived]
        );
      }
    }

    // 6. Automatic Double-Entry Accounting
    try {
      const { AccountsService } = require('./accounts.service');
      await AccountsService.recordSaleAccounting({
        id: saleId,
        invoice_number: invoiceNumber,
        sale_date: finalDate,
        total_cents: params.totalCents,
        paid_cents: params.paidCents,
        remaining_cents: remainingCents,
        payment_method: params.paymentMethod,
        customer_name: customerName,
      });
    } catch (err) {
      console.warn('Accounting entry error:', err);
    }

    return (await SalesService.getSaleById(saleId))!;
  },

  updateSale: async (saleId: number, params: CompleteSaleParams): Promise<void> => {
    const oldSale = await SalesService.getSaleById(saleId);
    if (!oldSale) throw new Error('الفاتورة غير موجودة');

    // 1. Revert previous stock deduction
    if (oldSale.items && oldSale.items.length > 0) {
      for (const oldIt of oldSale.items) {
        await executeSql('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [oldIt.quantity, oldIt.product_id]);
      }
    }

    // 2. Revert previous customer debt
    if (oldSale.customer_id && oldSale.remaining_cents > 0) {
      await executeSql('UPDATE customers SET current_balance_cents = MAX(0, current_balance_cents - ?) WHERE id = ?', [oldSale.remaining_cents, oldSale.customer_id]);
    }

    // 3. Revert previous cash shift
    if (oldSale.payment_method === 'cash' || oldSale.payment_method === 'mixed') {
      const oldCash = Math.min(oldSale.paid_cents, oldSale.total_cents);
      if (oldCash > 0) {
        await executeSql(`UPDATE shifts SET expected_cash_cents = expected_cash_cents - ? WHERE status = 'open'`, [oldCash]);
        await executeSql(`DELETE FROM cash_movements WHERE reference_type = 'sale' AND reference_id = ?`, [saleId]);
      }
    }

    // 4. Validate new stock
    for (const item of params.items) {
      const product = await queryFirst<{ stock_quantity: number; name: string }>('SELECT stock_quantity, name FROM products WHERE id = ?', [item.product_id]);
      if (!product) throw new Error(`الصنف (${item.name}) غير موجود`);
      if (product.stock_quantity < item.quantity) {
        // Rollback the reverted stock before throwing!
        for (const oldIt of oldSale.items || []) {
          await executeSql('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [oldIt.quantity, oldIt.product_id]);
        }
        throw new Error(`الكمية المتوفرة في المخزن من (${product.name}) هي (${product.stock_quantity}) فقط، لا يمكن بيع (${item.quantity})!`);
      }
    }

    const remainingCents = params.totalCents - params.paidCents;
    const finalDate = params.saleDate || oldSale.sale_date;

    // 5. Update Sale record
    await executeSql(
      `UPDATE sales SET 
        customer_id = ?, sale_date = ?, subtotal_cents = ?, discount_cents = ?, 
        total_cents = ?, paid_cents = ?, remaining_cents = ?, payment_method = ?, note = ?
       WHERE id = ?`,
      [
        params.customerId || null,
        finalDate,
        params.subtotalCents,
        params.discountCents,
        params.totalCents,
        params.paidCents,
        remainingCents,
        params.paymentMethod,
        params.note || null,
        saleId,
      ]
    );

    // 6. Delete old items and insert new ones
    await executeSql('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
    for (const item of params.items) {
      const lineTotal = item.unit_price_cents * item.quantity - (item.discount_cents || 0);
      await executeSql(
        `INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, unit_price_cents, discount_cents, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.name, item.barcode, item.quantity, item.unit_price_cents, item.discount_cents || 0, lineTotal]
      );

      // Deduct new stock
      await executeSql('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    // 7. Update new customer debt
    if (params.customerId && remainingCents > 0) {
      await executeSql('UPDATE customers SET current_balance_cents = current_balance_cents + ? WHERE id = ?', [remainingCents, params.customerId]);
    }

    // 8. Update new cash shift
    if (params.paymentMethod === 'cash' || params.paymentMethod === 'mixed') {
      const newCash = Math.min(params.paidCents, params.totalCents);
      if (newCash > 0) {
        await executeSql(
          `INSERT INTO cash_movements (type, amount_cents, reason, reference_type, reference_id, user_id, created_at)
           VALUES ('sale', ?, ?, 'sale', ?, ?, ?)`,
          [newCash, `تعديل فاتورة بيع ${oldSale.invoice_number}`, saleId, params.cashierId, finalDate]
        );
        await executeSql(`UPDATE shifts SET expected_cash_cents = expected_cash_cents + ? WHERE status = 'open'`, [newCash]);
      }
    }

    // 9. Synchronize Accounting Entry
    try {
      const { AccountsService } = require('./accounts.service');
      const cust = params.customerId ? await queryFirst<{ name: string }>('SELECT name FROM customers WHERE id = ?', [params.customerId]) : null;
      await AccountsService.recordSaleAccounting({
        id: saleId,
        invoice_number: oldSale.invoice_number,
        sale_date: finalDate,
        total_cents: params.totalCents,
        paid_cents: params.paidCents,
        remaining_cents: remainingCents,
        payment_method: params.paymentMethod,
        customer_name: cust?.name || 'عميل نقدي',
      });
    } catch (err) {
      console.warn('Update accounting error:', err);
    }
  },

  getSaleById: async (id: number): Promise<SaleRecord | null> => {
    const sale = await queryFirst<SaleRecord>(
      `SELECT s.*, c.name as customer_name, u.full_name as cashier_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.cashier_id = u.id
       WHERE s.id = ?`,
      [id]
    );

    if (!sale) return null;

    const items = await queryAll<SaleItemRecord>(
      'SELECT * FROM sale_items WHERE sale_id = ?',
      [id]
    );

    return { ...sale, items };
  },

  getAllSales: async (search?: string, dateFrom?: string, dateTo?: string): Promise<SaleRecord[]> => {
    let query = `
      SELECT s.*, c.name as customer_name, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (search && search.trim()) {
      query += ` AND (s.invoice_number LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (dateFrom) {
      query += ` AND date(s.sale_date) >= date(?)`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND date(s.sale_date) <= date(?)`;
      params.push(dateTo);
    }
    query += ` ORDER BY s.id DESC`;
    return await queryAll<SaleRecord>(query, params);
  },

  deleteSale: async (saleId: number): Promise<void> => {
    const sale = await SalesService.getSaleById(saleId);
    if (!sale) return;

    // 1. Restore product stock
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        if (item.product_id) {
          await executeSql(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
          const prod = await queryFirst<{ stock_quantity: number }>('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
          await executeSql(
            `INSERT INTO stock_movements (product_id, movement_type, quantity_change, balance_after, note)
             VALUES (?, 'manual_adjustment', ?, ?, ?)`,
            [item.product_id, item.quantity, prod?.stock_quantity || 0, `إلغاء وحذف الفاتورة ${sale.invoice_number}`]
          );
        }
      }
    }

    // 2. Rollback customer debt
    if (sale.customer_id && sale.remaining_cents > 0) {
      await executeSql(
        'UPDATE customers SET current_balance_cents = MAX(0, current_balance_cents - ?) WHERE id = ?',
        [sale.remaining_cents, sale.customer_id]
      );
    }

    // 3. Rollback shift cash if cash payment
    if (sale.payment_method === 'cash' || sale.payment_method === 'mixed') {
      const cashReceived = Math.min(sale.paid_cents, sale.total_cents);
      if (cashReceived > 0) {
        await executeSql(
          `UPDATE shifts SET expected_cash_cents = MAX(0, expected_cash_cents - ?) WHERE status = 'open'`,
          [cashReceived]
        );
        await executeSql(`DELETE FROM cash_movements WHERE reference_type = 'sale' AND reference_id = ?`, [saleId]);
      }
    }

    // 4. Delete double-entry accounting records
    try {
      const { AccountsService } = require('./accounts.service');
      await AccountsService.deleteJournalByReference('sale', saleId);
    } catch (err) {
      console.warn('Accounting deletion error:', err);
    }

    // 5. Delete sale record
    await executeSql('DELETE FROM sales WHERE id = ?', [saleId]);
  },

  // Hold / Resume Sales
  holdSale: async (referenceNote: string, cartItems: CartItem[], customerId?: number, userId?: number): Promise<number> => {
    const payload = JSON.stringify({ cartItems, customerId });
    const res = await executeSql(
      'INSERT INTO held_sales (reference_note, payload_json, created_by) VALUES (?, ?, ?)',
      [referenceNote, payload, userId || null]
    );
    return res.insertId;
  },

  getHeldSales: async (): Promise<HeldSale[]> => {
    return await queryAll<HeldSale>('SELECT * FROM held_sales ORDER BY id DESC');
  },

  deleteHeldSale: async (id: number): Promise<void> => {
    await executeSql('DELETE FROM held_sales WHERE id = ?', [id]);
  },
};
