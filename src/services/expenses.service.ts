import { queryAll, queryFirst, executeSql } from '../db/database';

export interface Expense {
  id: number;
  title: string;
  category: string;
  amount_cents: number;
  payment_method: string;
  expense_date: string;
  user_id?: number;
  note?: string;
  created_at: string;
}

export const ExpensesService = {
  getAll: async (): Promise<Expense[]> => {
    return await queryAll<Expense>('SELECT * FROM expenses ORDER BY id DESC');
  },

  add: async (expense: Omit<Expense, 'id' | 'created_at' | 'expense_date'>): Promise<number> => {
    const res = await executeSql(
      'INSERT INTO expenses (title, category, amount_cents, payment_method, user_id, note) VALUES (?, ?, ?, ?, ?, ?)',
      [
        expense.title,
        expense.category,
        expense.amount_cents,
        expense.payment_method || 'cash',
        expense.user_id || null,
        expense.note || null,
      ]
    );
    const expenseId = Number(res.insertId);

    if (expense.payment_method === 'cash') {
      await executeSql(
        `INSERT INTO cash_movements (type, amount_cents, reason, reference_type, reference_id, user_id)
         VALUES ('expense', ?, ?, 'expense', ?, ?)`,
        [-expense.amount_cents, `مصروف: ${expense.title}`, expenseId, expense.user_id || null]
      );

      // Deduct from active shift expected cash
      await executeSql(
        `UPDATE shifts SET expected_cash_cents = expected_cash_cents - ? WHERE status = 'open'`,
        [expense.amount_cents]
      );
    }

    // Record Double-Entry Accounting
    try {
      const { AccountsService } = require('./accounts.service');
      await AccountsService.recordExpenseAccounting({
        id: expenseId,
        title: expense.title,
        category: expense.category,
        amount_cents: expense.amount_cents,
        payment_method: expense.payment_method || 'cash',
      });
    } catch (err) {
      console.warn('Expense accounting error:', err);
    }

    return expenseId;
  },

  delete: async (id: number): Promise<void> => {
    const exp = await queryFirst<Expense>('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!exp) return;

    if (exp.payment_method === 'cash') {
      await executeSql(
        `UPDATE shifts SET expected_cash_cents = expected_cash_cents + ? WHERE status = 'open'`,
        [exp.amount_cents]
      );
      await executeSql("DELETE FROM cash_movements WHERE reference_type = 'expense' AND reference_id = ?", [id]);
    }

    try {
      const { AccountsService } = require('./accounts.service');
      await AccountsService.deleteJournalByReference('expense', id);
    } catch (err) {
      console.warn('Expense accounting delete error:', err);
    }

    await executeSql('DELETE FROM expenses WHERE id = ?', [id]);
  },
};
