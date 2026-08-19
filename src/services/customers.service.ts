import { queryAll, queryFirst, executeSql } from '../db/database';

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  credit_limit_cents: number;
  current_balance_cents: number;
  active: number;
  notes?: string;
  created_at?: string;
}

export interface CustomerPayment {
  id: number;
  customer_id: number;
  customer_name?: string;
  amount_cents: number;
  payment_method: string;
  note?: string;
  user_id?: number;
  created_at: string;
}

export const CustomersService = {
  getAll: async (search: string = ''): Promise<Customer[]> => {
    let sql = 'SELECT * FROM customers WHERE active = 1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id ASC';
    return await queryAll<Customer>(sql, params);
  },

  getById: async (id: number): Promise<Customer | null> => {
    return await queryFirst<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
  },

  add: async (customer: Omit<Customer, 'id' | 'current_balance_cents' | 'active'>): Promise<number> => {
    const res = await executeSql(
      'INSERT INTO customers (name, phone, address, credit_limit_cents, notes) VALUES (?, ?, ?, ?, ?)',
      [
        customer.name,
        customer.phone || null,
        customer.address || null,
        customer.credit_limit_cents || 0,
        customer.notes || null,
      ]
    );
    return res.insertId;
  },

  update: async (id: number, customer: Partial<Customer>): Promise<void> => {
    await executeSql(
      `UPDATE customers SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        credit_limit_cents = COALESCE(?, credit_limit_cents),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        customer.name ?? null,
        customer.phone ?? null,
        customer.address ?? null,
        customer.credit_limit_cents ?? null,
        customer.notes ?? null,
        id,
      ]
    );
  },

  recordPayment: async (
    customerId: number,
    amountCents: number,
    paymentMethod: string = 'cash',
    note?: string,
    userId?: number
  ): Promise<void> => {
    // 1. Insert customer payment
    await executeSql(
      'INSERT INTO customer_payments (customer_id, amount_cents, payment_method, note, user_id) VALUES (?, ?, ?, ?, ?)',
      [customerId, amountCents, paymentMethod, note || null, userId || null]
    );

    // 2. Reduce balance
    await executeSql(
      'UPDATE customers SET current_balance_cents = current_balance_cents - ? WHERE id = ?',
      [amountCents, customerId]
    );

    // 3. Record cash movement if cash
    if (paymentMethod === 'cash') {
      const cust = await CustomersService.getById(customerId);
      await executeSql(
        `INSERT INTO cash_movements (type, amount_cents, reason, reference_type, reference_id, user_id)
         VALUES ('customer_payment', ?, ?, 'customer', ?, ?)`,
        [amountCents, `تحصيل دين من العميل ${cust?.name || ''}`, customerId, userId || null]
      );

      // Update active shift expected cash
      await executeSql(
        `UPDATE shifts SET expected_cash_cents = expected_cash_cents + ? WHERE status = 'open'`,
        [amountCents]
      );
    }

    // 4. Double-Entry Accounting
    try {
      const { AccountsService } = require('./accounts.service');
      const cust = await CustomersService.getById(customerId);
      await AccountsService.recordCustomerPaymentAccounting({
        id: Date.now(),
        customer_id: customerId,
        customer_name: cust?.name || 'عميل',
        amount_cents: amountCents,
        payment_method: paymentMethod,
      });
    } catch (err) {
      console.warn('Customer payment accounting error:', err);
    }
  },

  getPaymentHistory: async (customerId: number): Promise<CustomerPayment[]> => {
    return await queryAll<CustomerPayment>(
      `SELECT cp.*, c.name as customer_name 
       FROM customer_payments cp
       JOIN customers c ON cp.customer_id = c.id
       WHERE cp.customer_id = ?
       ORDER BY cp.id DESC`,
      [customerId]
    );
  },
};
