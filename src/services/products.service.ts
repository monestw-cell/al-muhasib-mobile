import { queryAll, queryFirst, executeSql } from '../db/database';

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category_id: number;
  category_name?: string;
  unit: string;
  cost_price_cents: number;
  sale_price_cents: number;
  stock_quantity: number;
  min_stock_quantity: number;
  expiry_date?: string;
  supplier_id?: number;
  active: number;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  active: number;
}

export const ProductsService = {
  getAll: async (search: string = '', categoryId?: number): Promise<Product[]> => {
    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.active = 1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.barcode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      sql += ` AND p.category_id = ?`;
      params.push(categoryId);
    }

    sql += ` ORDER BY p.name ASC`;
    return await queryAll<Product>(sql, params);
  },

  getByBarcode: async (barcode: string): Promise<Product | null> => {
    const sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.barcode = ? AND p.active = 1
    `;
    return await queryFirst<Product>(sql, [barcode]);
  },

  getById: async (id: number): Promise<Product | null> => {
    const sql = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `;
    return await queryFirst<Product>(sql, [id]);
  },

  add: async (product: Omit<Product, 'id' | 'active'>): Promise<number> => {
    const res = await executeSql(
      `INSERT INTO products (barcode, name, category_id, unit, cost_price_cents, sale_price_cents, stock_quantity, min_stock_quantity, expiry_date, supplier_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.barcode,
        product.name,
        product.category_id,
        product.unit || 'حبة',
        product.cost_price_cents,
        product.sale_price_cents,
        product.stock_quantity,
        product.min_stock_quantity || 5,
        product.expiry_date || null,
        product.supplier_id || null,
      ]
    );

    // Initial stock movement
    await executeSql(
      `INSERT INTO stock_movements (product_id, movement_type, quantity_change, balance_after, note)
       VALUES (?, 'initial', ?, ?, 'إنشاء المنتج')`,
      [res.insertId, product.stock_quantity, product.stock_quantity]
    );

    return res.insertId;
  },

  update: async (id: number, product: Partial<Product>): Promise<void> => {
    await executeSql(
      `UPDATE products SET 
        barcode = COALESCE(?, barcode),
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        unit = COALESCE(?, unit),
        cost_price_cents = COALESCE(?, cost_price_cents),
        sale_price_cents = COALESCE(?, sale_price_cents),
        min_stock_quantity = COALESCE(?, min_stock_quantity),
        expiry_date = COALESCE(?, expiry_date),
        supplier_id = COALESCE(?, supplier_id),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        product.barcode ?? null,
        product.name ?? null,
        product.category_id ?? null,
        product.unit ?? null,
        product.cost_price_cents ?? null,
        product.sale_price_cents ?? null,
        product.min_stock_quantity ?? null,
        product.expiry_date ?? null,
        product.supplier_id ?? null,
        id,
      ]
    );
  },

  delete: async (id: number): Promise<void> => {
    await executeSql('UPDATE products SET active = 0 WHERE id = ?', [id]);
  },

  getCategories: async (): Promise<Category[]> => {
    return await queryAll<Category>('SELECT * FROM categories WHERE active = 1 ORDER BY name ASC');
  },

  addCategory: async (name: string): Promise<number> => {
    const res = await executeSql('INSERT INTO categories (name) VALUES (?)', [name]);
    return Number(res.insertId);
  },

  updateCategory: async (id: number, name: string): Promise<void> => {
    await executeSql('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
  },

  deleteCategory: async (id: number): Promise<void> => {
    await executeSql('UPDATE categories SET active = 0 WHERE id = ?', [id]);
  },

  getLowStock: async (): Promise<Product[]> => {
    return await queryAll<Product>(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = 1 AND p.stock_quantity <= p.min_stock_quantity 
       ORDER BY p.stock_quantity ASC`
    );
  },
};
