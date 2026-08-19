import { queryAll, queryFirst, executeSql } from '../db/database';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: number;
  balance_cents: number;
  is_system: number;
  created_at: string;
}

export interface JournalLineInput {
  accountId: number;
  debitCents: number;
  creditCents: number;
  description?: string;
}

export interface CreateJournalEntryParams {
  entryNumber?: string;
  entryDate?: string;
  description: string;
  referenceType?: string;
  referenceId?: number;
  lines: JournalLineInput[];
  userId?: number;
}

export interface JournalEntryRecord {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type?: string;
  reference_id?: number;
  total_cents: number;
  created_by?: number;
  lines?: JournalLineRecord[];
}

export interface JournalLineRecord {
  id: number;
  journal_id: number;
  account_id: number;
  account_code: string;
  account_name: string;
  debit_cents: number;
  credit_cents: number;
  description?: string;
}

export interface TrialBalanceItem {
  account_id: number;
  code: string;
  name: string;
  type: string;
  total_debit_cents: number;
  total_credit_cents: number;
  net_debit_cents: number;
  net_credit_cents: number;
}

export const DEFAULT_ACCOUNTS = [
  // Assets (الأصول)
  { code: '1101', name: 'الصندوق والدرج النقدي', type: 'asset', is_system: 1 },
  { code: '1102', name: 'الحساب البنكي / الشبكة', type: 'asset', is_system: 1 },
  { code: '1103', name: 'العملاء والمدينون (الذمم المدينة)', type: 'asset', is_system: 1 },
  { code: '1104', name: 'المخزون والبضاعة', type: 'asset', is_system: 1 },
  // Liabilities (الخصوم)
  { code: '2101', name: 'الموردون والدائنون (الذمم الدائنة)', type: 'liability', is_system: 1 },
  { code: '2102', name: 'أمانات ومستحقات ضريبية', type: 'liability', is_system: 1 },
  // Equity (حقوق الملكية)
  { code: '3101', name: 'رأس المال الافتتاحي', type: 'equity', is_system: 1 },
  { code: '3102', name: 'الأرباح والخسائر المرحلة', type: 'equity', is_system: 1 },
  // Revenue (الإيرادات)
  { code: '4101', name: 'إيراد المبيعات', type: 'revenue', is_system: 1 },
  { code: '4102', name: 'إيرادات وخصومات مكتسبة', type: 'revenue', is_system: 1 },
  // Expenses (المصروفات)
  { code: '5101', name: 'تكلفة البضاعة المباعة (COGS)', type: 'expense', is_system: 1 },
  { code: '5201', name: 'المصاريف العمومية والتشغيلية', type: 'expense', is_system: 1 },
  { code: '5202', name: 'إيجار ومرافق وكهرباء', type: 'expense', is_system: 1 },
  { code: '5203', name: 'رواتب وأجور العاملين', type: 'expense', is_system: 1 },
  { code: '5204', name: 'خصم مسموح به (خصومات المبيعات)', type: 'expense', is_system: 1 },
];

export const AccountsService = {
  initDefaultAccounts: async (): Promise<void> => {
    for (const acc of DEFAULT_ACCOUNTS) {
      const exists = await queryFirst('SELECT id FROM accounts WHERE code = ?', [acc.code]);
      if (!exists) {
        await executeSql(
          'INSERT INTO accounts (code, name, type, is_system, balance_cents) VALUES (?, ?, ?, ?, 0)',
          [acc.code, acc.name, acc.type, acc.is_system]
        );
      }
    }
  },

  getAllAccounts: async (): Promise<Account[]> => {
    await AccountsService.initDefaultAccounts();
    const tb = await AccountsService.getTrialBalance();
    const tbMap = new Map(tb.map(t => [t.account_id, t]));
    const all = await queryAll<Account>('SELECT * FROM accounts ORDER BY code ASC');
    return all.map(a => {
      const t = tbMap.get(a.id);
      let balance = 0;
      if (t) {
        if (a.type === 'asset' || a.type === 'expense') {
          balance = t.total_debit_cents - t.total_credit_cents;
        } else {
          balance = t.total_credit_cents - t.total_debit_cents;
        }
      }
      return {
        ...a,
        balance_cents: balance,
      };
    });
  },

  getAccountByCode: async (code: string): Promise<Account | null> => {
    return await queryFirst<Account>('SELECT * FROM accounts WHERE code = ?', [code]);
  },

  createAccount: async (code: string, name: string, type: Account['type']): Promise<number> => {
    const res = await executeSql(
      'INSERT INTO accounts (code, name, type, is_system, balance_cents) VALUES (?, ?, ?, 0, 0)',
      [code, name, type]
    );
    return res.insertId;
  },

  createJournalEntry: async (params: CreateJournalEntryParams): Promise<number> => {
    const totalDebit = params.lines.reduce((sum, l) => sum + (l.debitCents || 0), 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + (l.creditCents || 0), 0);

    const entryNum = params.entryNumber || `JV-${Date.now().toString().slice(-6)}`;
    const date = params.entryDate || new Date().toISOString();

    const res = await executeSql(
      `INSERT INTO journal_entries (entry_number, entry_date, description, reference_type, reference_id, total_cents, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entryNum,
        date,
        params.description,
        params.referenceType || null,
        params.referenceId || null,
        totalDebit,
        params.userId || null,
      ]
    );
    const journalId = Number(res.insertId);

    for (const line of params.lines) {
      await executeSql(
        `INSERT INTO journal_lines (journal_id, account_id, debit_cents, credit_cents, description)
         VALUES (?, ?, ?, ?, ?)`,
        [journalId, line.accountId, line.debitCents || 0, line.creditCents || 0, line.description || params.description]
      );
    }

    return journalId;
  },

  deleteJournalByReference: async (referenceType: string, referenceId: number): Promise<void> => {
    const entries = await queryAll<{ id: number }>(
      'SELECT id FROM journal_entries WHERE reference_type = ? AND reference_id = ?',
      [referenceType, referenceId]
    );
    for (const e of entries) {
      await executeSql('DELETE FROM journal_lines WHERE journal_id = ?', [e.id]);
    }
    await executeSql(
      'DELETE FROM journal_entries WHERE reference_type = ? AND reference_id = ?',
      [referenceType, referenceId]
    );
  },

  /**
   * Generates standard Trial Balance (ميزان المراجعة)
   */
  getTrialBalance: async (): Promise<TrialBalanceItem[]> => {
    await AccountsService.initDefaultAccounts();
    const query = `
      SELECT 
        a.id as account_id,
        a.code,
        a.name,
        a.type,
        COALESCE(SUM(jl.debit_cents), 0) as total_debit_cents,
        COALESCE(SUM(jl.credit_cents), 0) as total_credit_cents
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      GROUP BY a.id
      ORDER BY a.code ASC
    `;

    const rows = await queryAll<any>(query);

    return rows.map(r => {
      let netDebit = 0;
      let netCredit = 0;
      const isDebitNormal = r.type === 'asset' || r.type === 'expense';
      const balance = r.total_debit_cents - r.total_credit_cents;

      if (isDebitNormal) {
        if (balance >= 0) netDebit = balance;
        else netCredit = -balance;
      } else {
        if (balance <= 0) netCredit = -balance;
        else netDebit = balance;
      }

      return {
        account_id: r.account_id,
        code: r.code,
        name: r.name,
        type: r.type,
        total_debit_cents: r.total_debit_cents,
        total_credit_cents: r.total_credit_cents,
        net_debit_cents: netDebit,
        net_credit_cents: netCredit,
      };
    });
  },

  /**
   * General Ledger (دفتر الأستاذ)
   */
  getAccountLedger: async (accountId: number): Promise<any[]> => {
    return await queryAll<any>(
      `SELECT 
        je.entry_number,
        je.entry_date,
        jl.description,
        jl.debit_cents,
        jl.credit_cents
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_id = je.id
       WHERE jl.account_id = ?
       ORDER BY je.entry_date ASC, je.id ASC`,
      [accountId]
    );
  },

  /**
   * Automated Double-Entry Postings:
   */
  recordSaleAccounting: async (sale: { id: number; invoice_number: string; sale_date?: string; total_cents: number; paid_cents: number; remaining_cents: number; payment_method: string; customer_name?: string }): Promise<void> => {
    await AccountsService.deleteJournalByReference('sale', sale.id);

    const cashAcc = await AccountsService.getAccountByCode('1101');
    const bankAcc = await AccountsService.getAccountByCode('1102');
    const custAcc = await AccountsService.getAccountByCode('1103');
    const salesAcc = await AccountsService.getAccountByCode('4101');

    if (!cashAcc || !salesAcc || !custAcc || !bankAcc) return;

    const lines: JournalLineInput[] = [];

    // 1. Debit Cash / Bank
    if (sale.paid_cents > 0) {
      const targetAcc = sale.payment_method === 'card' ? bankAcc.id : cashAcc.id;
      lines.push({
        accountId: targetAcc,
        debitCents: sale.paid_cents,
        creditCents: 0,
        description: `تحصيل مبيعات فاتورة ${sale.invoice_number}`,
      });
    }

    // 2. Debit Customer if credit remaining
    if (sale.remaining_cents > 0) {
      lines.push({
        accountId: custAcc.id,
        debitCents: sale.remaining_cents,
        creditCents: 0,
        description: `مبيعات آجلة فاتورة ${sale.invoice_number} - العميل: ${sale.customer_name || 'عميل'}`,
      });
    }

    // 3. Credit Sales Revenue
    lines.push({
      accountId: salesAcc.id,
      debitCents: 0,
      creditCents: sale.total_cents,
      description: `إيراد مبيعات فاتورة ${sale.invoice_number}`,
    });

    await AccountsService.createJournalEntry({
      entryDate: sale.sale_date,
      description: `قيد فاتورة مبيعات ${sale.invoice_number}`,
      referenceType: 'sale',
      referenceId: sale.id,
      lines,
    });
  },

  recordPurchaseAccounting: async (purchase: { id: number; purchase_number: string; purchase_date?: string; total_cents: number; paid_cents: number; remaining_cents: number; supplier_name?: string }): Promise<void> => {
    await AccountsService.deleteJournalByReference('purchase', purchase.id);

    const cashAcc = await AccountsService.getAccountByCode('1101');
    const suppAcc = await AccountsService.getAccountByCode('2101');
    const invAcc = await AccountsService.getAccountByCode('1104');

    if (!cashAcc || !suppAcc || !invAcc) return;

    const lines: JournalLineInput[] = [];

    // 1. Debit Inventory (زيادة المخزون)
    lines.push({
      accountId: invAcc.id,
      debitCents: purchase.total_cents,
      creditCents: 0,
      description: `شراء بضاعة فاتورة ${purchase.purchase_number}`,
    });

    // 2. Credit Cash (المبلغ المدفوع)
    if (purchase.paid_cents > 0) {
      lines.push({
        accountId: cashAcc.id,
        debitCents: 0,
        creditCents: purchase.paid_cents,
        description: `سداد نقدي مشتريات فاتورة ${purchase.purchase_number}`,
      });
    }

    // 3. Credit Supplier (المبلغ المتبقي دين للمورد)
    if (purchase.remaining_cents > 0) {
      lines.push({
        accountId: suppAcc.id,
        debitCents: 0,
        creditCents: purchase.remaining_cents,
        description: `مستحقات مورد آجل فاتورة ${purchase.purchase_number} - ${purchase.supplier_name || 'المورد'}`,
      });
    }

    await AccountsService.createJournalEntry({
      entryDate: purchase.purchase_date,
      description: `قيد فاتورة شراء ${purchase.purchase_number}`,
      referenceType: 'purchase',
      referenceId: purchase.id,
      lines,
    });
  },

  recordCustomerPaymentAccounting: async (payment: { id: number; customer_id: number; customer_name: string; amount_cents: number; payment_method: string; date?: string }): Promise<void> => {
    const cashAcc = await AccountsService.getAccountByCode('1101');
    const bankAcc = await AccountsService.getAccountByCode('1102');
    const custAcc = await AccountsService.getAccountByCode('1103');

    if (!cashAcc || !bankAcc || !custAcc) return;

    const targetAcc = payment.payment_method === 'card' ? bankAcc.id : cashAcc.id;
    const lines: JournalLineInput[] = [
      {
        accountId: targetAcc,
        debitCents: payment.amount_cents,
        creditCents: 0,
        description: `تحصيل سند قبض من العميل: ${payment.customer_name}`,
      },
      {
        accountId: custAcc.id,
        debitCents: 0,
        creditCents: payment.amount_cents,
        description: `تخفيض ذمة العميل: ${payment.customer_name}`,
      },
    ];

    await AccountsService.createJournalEntry({
      entryDate: payment.date,
      description: `سند قبض عميل #${payment.id} - ${payment.customer_name}`,
      referenceType: 'customer_payment',
      referenceId: payment.id,
      lines,
    });
  },

  recordSupplierPaymentAccounting: async (payment: { id: number; supplier_id: number; supplier_name: string; amount_cents: number; payment_method: string; date?: string }): Promise<void> => {
    const cashAcc = await AccountsService.getAccountByCode('1101');
    const bankAcc = await AccountsService.getAccountByCode('1102');
    const suppAcc = await AccountsService.getAccountByCode('2101');

    if (!cashAcc || !bankAcc || !suppAcc) return;

    const targetAcc = payment.payment_method === 'card' ? bankAcc.id : cashAcc.id;
    const lines: JournalLineInput[] = [
      {
        accountId: suppAcc.id,
        debitCents: payment.amount_cents,
        creditCents: 0,
        description: `سداد سند صرف للمورد: ${payment.supplier_name}`,
      },
      {
        accountId: targetAcc,
        debitCents: 0,
        creditCents: payment.amount_cents,
        description: `دفع نقدي من الصندوق للمورد: ${payment.supplier_name}`,
      },
    ];

    await AccountsService.createJournalEntry({
      entryDate: payment.date,
      description: `سند صرف مورد #${payment.id} - ${payment.supplier_name}`,
      referenceType: 'supplier_payment',
      referenceId: payment.id,
      lines,
    });
  },

  recordExpenseAccounting: async (expense: { id: number; title: string; category: string; amount_cents: number; payment_method: string; date?: string }): Promise<void> => {
    const cashAcc = await AccountsService.getAccountByCode('1101');
    const bankAcc = await AccountsService.getAccountByCode('1102');
    const expAcc = await AccountsService.getAccountByCode('5201');

    if (!cashAcc || !bankAcc || !expAcc) return;

    const targetAcc = expense.payment_method === 'card' ? bankAcc.id : cashAcc.id;
    const lines: JournalLineInput[] = [
      {
        accountId: expAcc.id,
        debitCents: expense.amount_cents,
        creditCents: 0,
        description: `مصروف: ${expense.title} (${expense.category})`,
      },
      {
        accountId: targetAcc,
        debitCents: 0,
        creditCents: expense.amount_cents,
        description: `سداد مصروف: ${expense.title}`,
      },
    ];

    await AccountsService.createJournalEntry({
      entryDate: expense.date,
      description: `قيد مصروف #${expense.id} - ${expense.title}`,
      referenceType: 'expense',
      referenceId: expense.id,
      lines,
    });
  },
};
