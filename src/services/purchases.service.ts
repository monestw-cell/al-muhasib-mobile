import { queryAll, queryFirst, executeSql } from '../db/database';

export interface PurchaseItemInput {
  product_id: number;
  quantity: number;
  unit_cost_cents: number;
}

export interface CreatePurchaseParams {
  supplierId: number;
  purchaseNumber?: string;
  purchaseDate?: string;
  items: PurchaseItemInput[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paidCents: number;
  note?: string;
  userId?: number;
}

export interface PurchaseRecord {
  id: number;
  purchase_number: string;
  supplier_id: number;
  supplier_name?: string;
  purchase_date: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  paid_cents: number;
  remaining_cents: number;
  status: string;
  note?: string;
  items?: any[];
}

export const PurchasesService = {
  generatePurchaseNumber: async (): Promise<string> => {
    const countRes = await queryFirst<{ count: number }>('SELECT COUNT(id) as count FROM purchases');
    const nextNum = (countRes?.count || 0) + 1;
    return `PUR-${String(nextNum).padStart(4, '0')}`;
  },

  createPurchase: async (params: CreatePurchaseParams): Promise<number> => {
    const purchaseNum = params.purchaseNumber || (await PurchasesService.generatePurchaseNumber());
    const remainingCents = params.totalCents - params.paidCents;
    const finalDate = params.purchaseDate || new Date().toISOString();

    const res = await executeSql(
      `INSERT INTO purchases (
        purchase_number, supplier_id, purchase_date, subtotal_cents, discount_cents, total_cents, paid_cents, remaining_cents, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseNum,
        params.supplierId,
        finalDate,
        params.subtotalCents,
        params.discountCents,
        params.totalCents,
        params.paidCents,
        remainingCents,
        params.note || null,
      ]
    );
    const purchaseId = Number(res.insertId);

    for (const item of params.items) {
      const lineTotal = item.unit_cost_cents * item.quantity;
      await executeSql(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost_cents, line_total_cents)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.product_id, item.quantity, item.unit_cost_cents, lineTotal]
      );

      // Increase Stock
      const product = await queryFirst<{ stock_quantity: number }>('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
      if (product) {
        const newStock = product.stock_quantity + item.quantity;
        await executeSql('UPDATE products SET stock_quantity = ?, cost_price_cents = ? WHERE id = ?', [
          newStock,
          item.unit_cost_cents,
          item.product_id,
        ]);

        await executeSql(
          `INSERT INTO stock_movements (product_id, movement_type, quantity_change, balance_after, reference_type, reference_id, user_id, note, created_at)
           VALUES (?, 'purchase', ?, ?, 'purchase', ?, ?, ?, ?)`,
          [item.product_id, item.quantity, newStock, purchaseId, params.userId || null, `فاتورة شراء ${purchaseNum}`, finalDate]
        );
      }
    }

    // Update Supplier Balance
    let supplierName = 'المورد';
    if (params.supplierId) {
      const supp = await queryFirst<{ name: string }>('SELECT name FROM suppliers WHERE id = ?', [params.supplierId]);
      if (supp) supplierName = supp.name;
    }

    if (remainingCents > 0) {
      await executeSql('UPDATE suppliers SET current_balance_cents = current_balance_cents + ? WHERE id = ?', [
        remainingCents,
        params.supplierId,
      ]);
    }

    // Deduct Cash from Drawer / Shifts (Even if cash goes negative, accurately reflecting cash spent)
    if (params.paidCents > 0) {
      await executeSql(
        `INSERT INTO cash_movements (type, amount_cents, reason, reference_type, reference_id, user_id, created_at)
         VALUES ('purchase', ?, ?, 'purchase', ?, ?, ?)`,
        [-params.paidCents, `سداد نقدي لفاتورة شراء ${purchaseNum} (${supplierName})`, purchaseId, params.userId || null, finalDate]
      );

      await executeSql(
        `UPDATE shifts SET expected_cash_cents = expected_cash_cents - ? WHERE status = 'open'`,
        [params.paidCents]
      );
    }

    // Record Accounting Entry
    try {
      const { AccountsService } = require('./accounts.service');
      await AccountsService.recordPurchaseAccounting({
        id: purchaseId,
        purchase_number: purchaseNum,
        purchase_date: finalDate,
        total_cents: params.totalCents,
        paid_cents: params.paidCents,
        remaining_cents: remainingCents,
        supplier_name: supplierName,
      });
    } catch (err) {
      console.warn('Accounting entry error:', err);
    }

    return purchaseId;
  },

  updatePurchase: async (purchaseId: number, params: CreatePurchaseParams): Promise<void> => {
    const oldPurchase = await PurchasesService.getPurchaseById(purchaseId);
    if (!oldPurchase) throw new Error('فاتورة الشراء غير موجودة');

    // 1. Revert previous stock increase
    if (oldPurchase.items && oldPurchase.items.length > 0) {
      for (const oldIt of oldPurchase.items) {
        await executeSql('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [oldIt.quantity, oldIt.product_id]);
      }
    }

    // 2. Revert previous supplier balance
    if (oldPurchase.supplier_id && oldPurchase.remaining_cents > 0) {
      await executeSql('UPDATE suppliers SET current_balance_cents = MAX(0, current_balance_cents - ?) WHERE id = ?', [oldPurchase.remaining_cents, oldPurchase.supplier_id]);
    }

    // 3. Revert previous cash deduction
    if (oldPurchase.paid_cents > 0) {
      await executeSql(`UPDATE shifts SET expected_cash_cents = expected_cash_cents + ? WHERE status = 'open'`, [oldPurchase.paid_cents]);
      await executeSql(`DELETE FROM cash_movements WHERE reference_type = 'purchase' AND reference_id = ?`, [purchaseId]);
    }

    const remainingCents = params.totalCents - params.paidCents;
    const finalDate = params.purchaseDate || oldPurchase.purchase_date;

    // 4. Update Purchases Record
    await executeSql(
      `UPDATE purchases SET 
        supplier_id = ?, purchase_date = ?, subtotal_cents = ?, discount_cents = ?, 
        total_cents = ?, paid_cents = ?, remaining_cents = ?, note = ?
       WHERE id = ?`,
      [
        params.supplierId,
        finalDate,
        params.subtotalCents,
        params.discountCents,
        params.totalCents,
        params.paidCents,
        remainingCents,
        params.note || null,
        purchaseId,
      ]
    );

    // 5. Delete old items and insert new ones
    await executeSql('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
    for (const item of params.items) {
      const lineTotal = item.unit_cost_cents * item.quantity;
      await executeSql(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost_cents, line_total_cents)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.product_id, item.quantity, item.unit_cost_cents, lineTotal]
      );

      // Increase stock
      await executeSql('UPDATE products SET stock_quantity = stock_quantity + ?, cost_price_cents = ? WHERE id = ?', [
        item.quantity,
        item.unit_cost_cents,
        item.product_id,
      ]);
    }

    // 6. Update Supplier Balance
    let supplierName = 'المورد';
    if (params.supplierId) {
      const supp = await queryFirst<{ name: string }>('SELECT name FROM suppliers WHERE id = ?', [params.supplierId]);
      if (supp) supplierName = supp.name;
    }

    if (remainingCents > 0) {
      await executeSql('UPDATE suppliers SET current_balance_cents = current_balance_cents + ? WHERE id = ?', [remainingCents, params.supplierId]);
    }

    // 7. Update Cash Shift
    if (params.paidCents > 0) {
      await executeSql(
        `INSERT INTO cash_movements (type, amount_cents, reason, reference_type, reference_id, user_id, created_at)
         VALUES ('purchase', ?, ?, 'purchase', ?, ?, ?)`,
        [-params.paidCents, `تعديل سداد نقدي لفاتورة شراء ${oldPurchase.purchase_number}`, purchaseId, params.userId || null, finalDate]
      );
      await executeSql(`UPDATE shifts SET expected_cash_cents = expected_cash_cents - ? WHERE status = 'open'`, [params.paidCents]);
    }

    // 8. Synchronize Accounting Entry
    try {
      const { AccountsService } = require('./accounts.service');
      await AccountsService.recordPurchaseAccounting({
        id: purchaseId,
        purchase_number: oldPurchase.purchase_number,
        purchase_date: finalDate,
        total_cents: params.totalCents,
        paid_cents: params.paidCents,
        remaining_cents: remainingCents,
        supplier_name: supplierName,
      });
    } catch (err) {
      console.warn('Purchase update accounting error:', err);
    }
  },

  getPurchaseById: async (id: number): Promise<PurchaseRecord | null> => {
    const purchase = await queryFirst<PurchaseRecord>(
      `SELECT p.*, s.name as supplier_name
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = ?`,
      [id]
    );

    if (!purchase) return null;

    const items = await queryAll(
      `SELECT pi.*, pr.name as product_name
       FROM purchase_items pi
       LEFT JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = ?`,
      [id]
    );

    return { ...purchase, items };
  },

  getAll: async (search?: string, dateFrom?: string, dateTo?: string): Promise<PurchaseRecord[]> => {
    let query = `
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (search && search.trim()) {
      query += ` AND (p.purchase_number LIKE ? OR s.name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (dateFrom) {
      query += ` AND date(p.purchase_date) >= date(?)`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND date(p.purchase_date) <= date(?)`;
      params.push(dateTo);
    }
    query += ` ORDER BY p.id DESC`;
    return await queryAll<PurchaseRecord>(query, params);
  },

  deletePurchase: async (purchaseId: number): Promise<void> => {
    const purchase = await PurchasesService.getPurchaseById(purchaseId);
    if (!purchase) return;

    // 1. Revert product stock additions
    if (purchase.items && purchase.items.length > 0) {
      for (const item of purchase.items) {
        if (item.product_id) {
          await executeSql(
            'UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    // 2. Revert supplier balance
    if (purchase.supplier_id && purchase.remaining_cents > 0) {
      await executeSql(
        'UPDATE suppliers SET current_balance_cents = MAX(0, current_balance_cents - ?) WHERE id = ?',
        [purchase.remaining_cents, purchase.supplier_id]
      );
    }

    // 3. Revert cash paid
    if (purchase.paid_cents > 0) {
      await executeSql(
        `UPDATE shifts SET expected_cash_cents = expected_cash_cents + ? WHERE status = 'open'`,
        [purchase.paid_cents]
      );
      await executeSql(`DELETE FROM cash_movements WHERE reference_type = 'purchase' AND reference_id = ?`, [purchaseId]);
    }

    // 4. Delete double-entry accounting records
    try {
      const { AccountsService } = require('./accounts.service');
      await AccountsService.deleteJournalByReference('purchase', purchaseId);
    } catch (err) {
      console.warn('Purchase delete accounting error:', err);
    }

    // 5. Delete purchase record
    await executeSql('DELETE FROM purchases WHERE id = ?', [purchaseId]);
  },
};
