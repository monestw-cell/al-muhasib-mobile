import { getDatabase, executeSql, queryFirst } from './database';
import { hashPassword } from '../utils/security';

export const seedDatabase = async (): Promise<void> => {
  const db = await getDatabase();

  // Check if users already seeded
  const existingUser = await queryFirst('SELECT id FROM users LIMIT 1');
  if (existingUser) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding database with initial default configuration...');

  const defaultPasswordHash = await hashPassword('123456');

  // 1. Default Users
  const users = [
    { username: 'admin', full_name: 'مدير النظام', role: 'admin' },
    { username: 'cashier', full_name: 'الكاشير', role: 'cashier' },
    { username: 'accountant', full_name: 'المحاسب', role: 'accountant' },
  ];

  for (const u of users) {
    await executeSql(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [u.username, defaultPasswordHash, u.full_name, u.role]
    );
  }

  // 2. Shop Info
  await executeSql(
    `INSERT OR REPLACE INTO shop_info (id, store_name, phone, address, receipt_footer, tax_number, cr_number, pdf_theme_color, show_signature, signature_title) 
     VALUES (1, 'متجري', '050-000-0000', 'الشارع الرئيسي', 'شكراً لزيارتكم وصحتين وعافية!', '', '', '#00685f', 1, 'توقيع وختم المحل')`
  );

  // 3. Default Categories
  const categories = ['عام'];
  for (const c of categories) {
    await executeSql('INSERT INTO categories (name) VALUES (?)', [c]);
  }

  // 4. Default Cash Customer
  await executeSql(
    'INSERT INTO customers (id, name, phone, credit_limit_cents, current_balance_cents) VALUES (1, ?, ?, ?, ?)',
    ['عميل نقدي (افتراضي)', '', 0, 0]
  );

  // 5. Initial Open Cash Shift
  await executeSql(
    `INSERT INTO shifts (user_id, opening_balance_cents, expected_cash_cents, actual_cash_cents, status)
     VALUES (1, 0, 0, 0, 'open')`
  );

  console.log('Clean database initial setup completed successfully!');
};
