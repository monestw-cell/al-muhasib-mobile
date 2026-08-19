import { queryAll, queryFirst, executeSql } from '../db/database';

export interface Shift {
  id: number;
  user_id: number;
  user_name?: string;
  opened_at: string;
  closed_at?: string;
  opening_balance_cents: number;
  expected_cash_cents: number;
  actual_cash_cents: number;
  difference_cents: number;
  status: 'open' | 'closed';
  note?: string;
}

export interface CashMovement {
  id: number;
  type: string;
  amount_cents: number;
  reason?: string;
  user_id?: number;
  created_at: string;
}

export const CashService = {
  getActiveShift: async (): Promise<Shift | null> => {
    return await queryFirst<Shift>(
      `SELECT s.*, u.full_name as user_name 
       FROM shifts s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.status = 'open' 
       ORDER BY s.id DESC LIMIT 1`
    );
  },

  openShift: async (userId: number, openingBalanceCents: number): Promise<number> => {
    const res = await executeSql(
      'INSERT INTO shifts (user_id, opening_balance_cents, expected_cash_cents, status) VALUES (?, ?, ?, "open")',
      [userId, openingBalanceCents, openingBalanceCents]
    );
    return res.insertId;
  },

  closeShift: async (shiftId: number, actualCashCents: number, note?: string): Promise<void> => {
    const shift = await queryFirst<Shift>('SELECT expected_cash_cents FROM shifts WHERE id = ?', [shiftId]);
    const expected = shift?.expected_cash_cents || 0;
    const diff = actualCashCents - expected;

    await executeSql(
      `UPDATE shifts SET 
        closed_at = CURRENT_TIMESTAMP, 
        actual_cash_cents = ?, 
        difference_cents = ?, 
        status = 'closed', 
        note = ? 
       WHERE id = ?`,
      [actualCashCents, diff, note || null, shiftId]
    );
  },

  addCashMovement: async (
    type: 'deposit' | 'withdraw',
    amountCents: number,
    reason: string,
    userId?: number
  ): Promise<void> => {
    const effectiveAmount = type === 'withdraw' ? -amountCents : amountCents;

    await executeSql(
      'INSERT INTO cash_movements (type, amount_cents, reason, user_id) VALUES (?, ?, ?, ?)',
      [type, effectiveAmount, reason, userId || null]
    );

    // Update active shift expected cash
    await executeSql(
      `UPDATE shifts SET expected_cash_cents = expected_cash_cents + ? WHERE status = 'open'`,
      [effectiveAmount]
    );
  },

  getMovements: async (): Promise<CashMovement[]> => {
    return await queryAll<CashMovement>('SELECT * FROM cash_movements ORDER BY id DESC LIMIT 50');
  },
};
