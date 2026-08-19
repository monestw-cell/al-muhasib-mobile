import { queryAll, queryFirst, executeSql } from '../db/database';

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  movement_type: string;
  quantity_change: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: number;
  user_id?: number;
  note?: string;
  created_at: string;
}

export const InventoryService = {
  adjustStock: async (
    productId: number,
    quantityChange: number,
    reason: string,
    userId?: number
  ): Promise<void> => {
    const product = await queryFirst<{ stock_quantity: number }>(
      'SELECT stock_quantity FROM products WHERE id = ?',
      [productId]
    );

    if (!product) throw new Error('المنتج غير موجود');

    const newStock = product.stock_quantity + quantityChange;

    await executeSql('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, productId]);

    await executeSql(
      `INSERT INTO stock_movements (product_id, movement_type, quantity_change, balance_after, user_id, note)
       VALUES (?, 'manual_adjustment', ?, ?, ?, ?)`,
      [productId, quantityChange, newStock, userId || null, reason]
    );
  },

  getMovements: async (productId?: number): Promise<StockMovement[]> => {
    let sql = `
      SELECT sm.*, p.name as product_name 
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
    `;
    const params: any[] = [];

    if (productId) {
      sql += ' WHERE sm.product_id = ?';
      params.push(productId);
    }

    sql += ' ORDER BY sm.created_at DESC LIMIT 100';

    return await queryAll<StockMovement>(sql, params);
  },
};
