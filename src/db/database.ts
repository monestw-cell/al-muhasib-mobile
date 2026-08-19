import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

const DB_NAME = 'al_muhasib_al_hanyouk.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
};

export const initDatabase = async (): Promise<void> => {
  const db = await getDatabase();
  await db.execAsync(CREATE_TABLES_SQL);
  
  // Safe migrations
  const migrations = [
    "ALTER TABLE users ADD COLUMN avatar_path TEXT DEFAULT '';",
    "ALTER TABLE shop_info ADD COLUMN tax_number TEXT DEFAULT '';",
    "ALTER TABLE shop_info ADD COLUMN cr_number TEXT DEFAULT '';",
    "ALTER TABLE shop_info ADD COLUMN pdf_theme_color TEXT DEFAULT '#00685f';",
    "ALTER TABLE shop_info ADD COLUMN show_signature INTEGER DEFAULT 1;",
    "ALTER TABLE shop_info ADD COLUMN signature_title TEXT DEFAULT 'توقيع وختم المحل';",
  ];

  for (const mig of migrations) {
    try {
      await db.execAsync(mig);
    } catch (e) {
      // Column exists, ignore
    }
  }
};

export const wipeAllData = async (): Promise<void> => {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM journal_lines;
    DELETE FROM journal_entries;
    DELETE FROM sale_items;
    DELETE FROM sale_payments;
    DELETE FROM sales;
    DELETE FROM held_sales;
    DELETE FROM purchase_items;
    DELETE FROM purchases;
    DELETE FROM supplier_payments;
    DELETE FROM customer_payments;
    DELETE FROM expenses;
    DELETE FROM cash_movements;
    DELETE FROM stock_movements;
    DELETE FROM products;
    UPDATE customers SET current_balance_cents = 0;
    DELETE FROM customers WHERE id > 1;
    UPDATE suppliers SET current_balance_cents = 0;
    DELETE FROM suppliers;
    DELETE FROM shifts;
    INSERT INTO shifts (user_id, opening_balance_cents, expected_cash_cents, actual_cash_cents, status)
    VALUES (1, 0, 0, 0, 'open');
  `);
};

export const executeSql = async (
  sql: string,
  params: (string | number | null | undefined)[] = []
): Promise<{ insertId: number; lastInsertRowId: number; changes: number }> => {
  const db = await getDatabase();
  const res = await db.runAsync(sql, params as any[]);
  const id = Number(res.lastInsertRowId);
  return {
    insertId: id,
    lastInsertRowId: id,
    changes: res.changes,
  };
};

export const queryAll = async <T = any>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> => {
  const db = await getDatabase();
  return await db.getAllAsync<T>(sql, params);
};

export const queryFirst = async <T = any>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T | null> => {
  const db = await getDatabase();
  return await db.getFirstAsync<T>(sql, params);
};
