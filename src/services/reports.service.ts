import { queryAll, queryFirst } from '../db/database';

export interface FinancialSummaryKPIs {
  salesCents: number;
  profitCents: number;
  invoicesCount: number;
  cashBalanceCents: number;
  customerDebtsCents: number;
  inventoryValuationCents: number;
  purchasesCents: number;
  expensesCents: number;
  netIncomeCents: number;
  // Aliases for dashboard compatibility
  todaySalesCents?: number;
  todayProfitCents?: number;
  todayInvoicesCount?: number;
}

export type DashboardKPIs = FinancialSummaryKPIs;

export interface InventoryAuditItem {
  id: number;
  barcode: string;
  name: string;
  unit: string;
  stock_quantity: number;
  min_stock_quantity: number;
  cost_price_cents: number;
  sale_price_cents: number;
  total_cost_val_cents: number;
  total_sale_val_cents: number;
  potential_profit_cents: number;
}

export interface ProductProfitItem {
  product_id: number;
  product_name: string;
  barcode: string;
  total_qty_sold: number;
  total_revenue_cents: number;
  total_cost_cents: number;
  net_profit_cents: number;
  profit_margin_pct: number;
}

export const ReportsService = {
  getFinancialSummary: async (dateFrom?: string, dateTo?: string): Promise<FinancialSummaryKPIs> => {
    let salesQuery = `SELECT COALESCE(SUM(total_cents), 0) as total, COUNT(id) as count FROM sales WHERE status = 'completed'`;
    let profitQuery = `
      SELECT COALESCE(SUM((si.unit_price_cents - COALESCE(p.cost_price_cents, 0)) * si.quantity), 0) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.status = 'completed'
    `;
    let purchasesQuery = `SELECT COALESCE(SUM(total_cents), 0) as total FROM purchases WHERE 1=1`;
    let expensesQuery = `SELECT COALESCE(SUM(amount_cents), 0) as total FROM expenses WHERE 1=1`;

    const salesParams: any[] = [];
    const profitParams: any[] = [];
    const purchasesParams: any[] = [];
    const expensesParams: any[] = [];

    if (dateFrom) {
      salesQuery += ` AND date(sale_date) >= date(?)`;
      salesParams.push(dateFrom);

      profitQuery += ` AND date(s.sale_date) >= date(?)`;
      profitParams.push(dateFrom);

      purchasesQuery += ` AND date(purchase_date) >= date(?)`;
      purchasesParams.push(dateFrom);

      expensesQuery += ` AND date(expense_date) >= date(?)`;
      expensesParams.push(dateFrom);
    }

    if (dateTo) {
      salesQuery += ` AND date(sale_date) <= date(?)`;
      salesParams.push(dateTo);

      profitQuery += ` AND date(s.sale_date) <= date(?)`;
      profitParams.push(dateTo);

      purchasesQuery += ` AND date(purchase_date) <= date(?)`;
      purchasesParams.push(dateTo);

      expensesQuery += ` AND date(expense_date) <= date(?)`;
      expensesParams.push(dateTo);
    }

    const salesRes = await queryFirst<{ total: number; count: number }>(salesQuery, salesParams);
    const profitRes = await queryFirst<{ profit: number }>(profitQuery, profitParams);
    const purchasesRes = await queryFirst<{ total: number }>(purchasesQuery, purchasesParams);
    const expensesRes = await queryFirst<{ total: number }>(expensesQuery, expensesParams);

    // Active shift cash
    const shift = await queryFirst<{ expected_cash_cents: number }>(
      `SELECT expected_cash_cents FROM shifts WHERE status = 'open' LIMIT 1`
    );

    // Customer debts
    const debtsRes = await queryFirst<{ total_debt: number }>(
      `SELECT COALESCE(SUM(current_balance_cents), 0) as total_debt FROM customers WHERE active = 1`
    );

    // Inventory valuation: SUM(cost_price * stock_quantity)
    const inventoryRes = await queryFirst<{ total_val: number }>(
      `SELECT COALESCE(SUM(cost_price_cents * stock_quantity), 0) as total_val FROM products WHERE active = 1`
    );

    const grossProfit = profitRes?.profit || 0;
    const totalExpenses = expensesRes?.total || 0;
    const netIncome = grossProfit - totalExpenses;

    return {
      salesCents: salesRes?.total || 0,
      profitCents: grossProfit,
      invoicesCount: salesRes?.count || 0,
      cashBalanceCents: shift?.expected_cash_cents || 0,
      customerDebtsCents: debtsRes?.total_debt || 0,
      inventoryValuationCents: inventoryRes?.total_val || 0,
      purchasesCents: purchasesRes?.total || 0,
      expensesCents: totalExpenses,
      netIncomeCents: netIncome,
      todaySalesCents: salesRes?.total || 0,
      todayProfitCents: grossProfit,
      todayInvoicesCount: salesRes?.count || 0,
    };
  },

  getDashboardKPIs: async (): Promise<DashboardKPIs> => {
    const today = new Date().toISOString().split('T')[0];
    return await ReportsService.getFinancialSummary(today, today);
  },

  getSalesByDateRange: async (startDate: string, endDate: string) => {
    return await queryAll(
      `SELECT s.*, c.name as customer_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE DATE(s.sale_date) BETWEEN ? AND ?
       ORDER BY s.id DESC`,
      [startDate, endDate]
    );
  },

  getPaymentMethodBreakdown: async (dateFrom?: string, dateTo?: string) => {
    let query = `
      SELECT payment_method, COUNT(id) as count, COALESCE(SUM(total_cents), 0) as total_cents
      FROM sales
      WHERE status = 'completed'
    `;
    const params: any[] = [];
    if (dateFrom) {
      query += ` AND date(sale_date) >= date(?)`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND date(sale_date) <= date(?)`;
      params.push(dateTo);
    }
    query += ` GROUP BY payment_method`;
    return await queryAll(query, params);
  },

  getTopSellingProducts: async (limit: number = 10, dateFrom?: string, dateTo?: string) => {
    let query = `
      SELECT si.product_name, SUM(si.quantity) as total_qty, SUM(si.line_total_cents) as total_sales_cents
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
    `;
    const params: any[] = [];
    if (dateFrom) {
      query += ` AND date(s.sale_date) >= date(?)`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND date(s.sale_date) <= date(?)`;
      params.push(dateTo);
    }
    query += ` GROUP BY si.product_id ORDER BY total_qty DESC LIMIT ?`;
    params.push(limit);
    return await queryAll(query, params);
  },

  /**
   * Complete Inventory Valuation & Stock Audit
   */
  getInventoryAudit: async (): Promise<InventoryAuditItem[]> => {
    const products = await queryAll<any>(
      `SELECT id, barcode, name, unit, stock_quantity, min_stock_quantity, cost_price_cents, sale_price_cents
       FROM products
       WHERE active = 1
       ORDER BY name ASC`
    );

    return products.map(p => {
      const costVal = (p.cost_price_cents || 0) * (p.stock_quantity || 0);
      const saleVal = (p.sale_price_cents || 0) * (p.stock_quantity || 0);
      return {
        id: p.id,
        barcode: p.barcode,
        name: p.name,
        unit: p.unit || 'حبة',
        stock_quantity: p.stock_quantity || 0,
        min_stock_quantity: p.min_stock_quantity || 0,
        cost_price_cents: p.cost_price_cents || 0,
        sale_price_cents: p.sale_price_cents || 0,
        total_cost_val_cents: costVal,
        total_sale_val_cents: saleVal,
        potential_profit_cents: saleVal - costVal,
      };
    });
  },

  /**
   * Product Profitability Report with Date Range Filtering
   */
  getProductProfitability: async (dateFrom?: string, dateTo?: string): Promise<ProductProfitItem[]> => {
    let query = `
      SELECT 
        si.product_id,
        si.product_name,
        si.barcode,
        SUM(si.quantity) as total_qty_sold,
        SUM(si.line_total_cents) as total_revenue_cents,
        SUM(COALESCE(p.cost_price_cents, 0) * si.quantity) as total_cost_cents
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       LEFT JOIN products p ON si.product_id = p.id
       WHERE s.status = 'completed'
    `;
    const params: any[] = [];
    if (dateFrom) {
      query += ` AND date(s.sale_date) >= date(?)`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND date(s.sale_date) <= date(?)`;
      params.push(dateTo);
    }
    query += ` GROUP BY si.product_id ORDER BY total_revenue_cents DESC`;

    const rows = await queryAll<any>(query, params);

    return rows.map(r => {
      const revenue = r.total_revenue_cents || 0;
      const cost = r.total_cost_cents || 0;
      const netProfit = revenue - cost;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      return {
        product_id: r.product_id,
        product_name: r.product_name,
        barcode: r.barcode,
        total_qty_sold: r.total_qty_sold || 0,
        total_revenue_cents: revenue,
        total_cost_cents: cost,
        net_profit_cents: netProfit,
        profit_margin_pct: Math.round(margin * 10) / 10,
      };
    });
  },
};
