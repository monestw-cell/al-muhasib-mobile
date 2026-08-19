import { queryAll, queryFirst, executeSql } from '../db/database';

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  current_balance_cents: number;
  active: number;
  notes?: string;
  created_at?: string;
}

export const SuppliersService = {
  getAll: async (search: string = ''): Promise<Supplier[]> => {
    let sql = 'SELECT * FROM suppliers WHERE active = 1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id ASC';
    return await queryAll<Supplier>(sql, params);
  },

  getById: async (id: number): Promise<Supplier | null> => {
    return await queryFirst<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id]);
  },

  add: async (supplier: Omit<Supplier, 'id' | 'current_balance_cents' | 'active'>): Promise<number> => {
    const res = await executeSql(
      'INSERT INTO suppliers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
      [supplier.name, supplier.phone || null, supplier.address || null, supplier.notes || null]
    );
    return res.insertId;
  },

  update: async (id: number, supplier: Partial<Supplier>): Promise<void> => {
    await executeSql(
      `UPDATE suppliers SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        notes = COALESCE(?, notes)
       WHERE id = ?`,
      [supplier.name ?? null, supplier.phone ?? null, supplier.address ?? null, supplier.notes ?? null, id]
    );
  },

  delete: async (id: number): Promise<void> => {
    await executeSql('UPDATE suppliers SET active = 0 WHERE id = ?', [id]);
  },

  recordPayment: async (
    supplierId: number,
    amountCents: number,
    paymentMethod: string = 'cash',
    note?: string,
    userId?: number
  ): Promise<void> => {
    await executeSql(
      'INSERT INTO supplier_payments (supplier_id, amount_cents, payment_method, note, user_id) VALUES (?, ?, ?, ?, ?)',
      [supplierId, amountCents, paymentMethod, note || null, userId || null]
    );

    await executeSql(
      'UPDATE suppliers SET current_balance_cents = current_balance_cents - ? WHERE id = ?',
      [amountCents, supplierId]
    );

    if (paymentMethod === 'cash') {
      const supp = await queryFirst<Supplier>('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
      await executeSql(
        `INSERT INTO cash_movements (type, amount_cents, reason, reference_type, reference_id, user_id)
         VALUES ('supplier_payment', ?, ?, 'supplier', ?, ?)`,
        [-amountCents, `سداد مورد ${supp?.name || ''}`, supplierId, userId || null]
      );

      // Deduct from active shift expected cash
      await executeSql(
        `UPDATE shifts SET expected_cash_cents = expected_cash_cents - ? WHERE status = 'open'`,
        [amountCents]
      );
    }

    // Double-Entry Accounting
    try {
      const { AccountsService } = require('./accounts.service');
      const supp = await SuppliersService.getById(supplierId);
      await AccountsService.recordSupplierPaymentAccounting({
        id: Date.now(),
        supplier_id: supplierId,
        supplier_name: supp?.name || 'المورد',
        amount_cents: amountCents,
        payment_method: paymentMethod,
      });
    } catch (err) {
      console.warn('Supplier payment accounting error:', err);
    }
  },
};
