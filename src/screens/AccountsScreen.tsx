import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { AccountsService, Account, JournalEntryRecord, TrialBalanceItem } from '../services/accounts.service';
import { PdfExportService } from '../services/pdf-export.service';
import { formatCurrency, shekelsToAgorot, agorotToShekels } from '../utils/currency';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface AccountsScreenProps {
  onBack?: () => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'chart' | 'ledger' | 'journal'>('chart');

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);

  // Add Account Modal
  const [addAccountModal, setAddAccountModal] = useState(false);
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<Account['type']>('asset');

  // Add Journal Entry Modal
  const [addEntryModal, setAddEntryModal] = useState(false);
  const [entryDesc, setEntryDesc] = useState('');
  const [debitAccId, setDebitAccId] = useState<number | null>(null);
  const [creditAccId, setCreditAccId] = useState<number | null>(null);
  const [entryAmount, setEntryAmount] = useState('');

  useEffect(() => {
    loadAccountsData();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger(selectedAccountId);
    }
  }, [selectedAccountId]);

  const loadAccountsData = async () => {
    const accs = await AccountsService.getAllAccounts();
    setAccounts(accs);
    if (accs.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accs[0].id);
    }
    const tb = await AccountsService.getTrialBalance();
    setTrialBalance(tb);
  };

  const loadLedger = async (accId: number) => {
    const entries = await AccountsService.getAccountLedger(accId);
    setLedgerEntries(entries);
  };

  const handleSaveAccount = async () => {
    if (!newAccCode || !newAccName) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم واسم الحساب');
      return;
    }
    try {
      await AccountsService.createAccount(newAccCode, newAccName, newAccType);
      setAddAccountModal(false);
      setNewAccCode('');
      setNewAccName('');
      loadAccountsData();
      Alert.alert('نجاح', 'تمت إضافة الحساب بنجاح إلى شجرة الحسابات');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل حفظ الحساب');
    }
  };

  const handleSaveJournalEntry = async () => {
    if (!debitAccId || !creditAccId || !entryAmount || !entryDesc) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول واختيار طرفي القيد (المدين والدائن)');
      return;
    }
    if (debitAccId === creditAccId) {
      Alert.alert('تنبيه', 'لا يمكن أن يكون الطرف المدين هو نفسه الطرف الدائن');
      return;
    }

    const amountCents = shekelsToAgorot(entryAmount);
    try {
      await AccountsService.createJournalEntry({
        description: entryDesc,
        referenceType: 'manual',
        userId: user?.id,
        lines: [
          { accountId: debitAccId, debitCents: amountCents, creditCents: 0, description: entryDesc },
          { accountId: creditAccId, debitCents: 0, creditCents: amountCents, description: entryDesc },
        ],
      });

      setAddEntryModal(false);
      setEntryDesc('');
      setEntryAmount('');
      loadAccountsData();
      if (selectedAccountId) loadLedger(selectedAccountId);
      Alert.alert('تم بنجاح', 'تم ترحيل القيد المحاسبي المتوازن وتحديث الأرصدة بنجاح');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل ترحيل القيد');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'asset': return { label: 'أصول', color: theme.primary };
      case 'liability': return { label: 'خصوم والتزامات', color: theme.error };
      case 'equity': return { label: 'حقوق ملكية', color: theme.secondary };
      case 'revenue': return { label: 'إيرادات', color: '#059669' };
      case 'expense': return { label: 'مصروفات', color: '#d97706' };
      default: return { label: type, color: theme.outline };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Header title="إدارة الحسابات والشجرة المحاسبية" showBack={!!onBack} onBackPress={onBack} />

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant }]}>
        {[
          { key: 'chart', label: 'دليل وشجرة الحسابات', icon: 'file-tree-outline' },
          { key: 'ledger', label: 'دفتر الأستاذ العام', icon: 'book-open-outline' },
          { key: 'journal', label: 'إضافة قيد يومية', icon: 'playlist-edit' },
        ].map(t => {
          const isSel = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, isSel && { backgroundColor: theme.primary }]}
              onPress={() => {
                if (t.key === 'journal') {
                  setAddEntryModal(true);
                } else {
                  setActiveTab(t.key as any);
                }
              }}
            >
              <MaterialCommunityIcons name={t.icon as any} size={18} color={isSel ? theme.onPrimary : theme.onSurface} />
              <Text style={[styles.tabText, { color: isSel ? theme.onPrimary : theme.onSurface }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Tab Content */}
      {activeTab === 'chart' && (
        <View style={{ flex: 1 }}>
          <View style={styles.chartTopRow}>
            <Text style={[styles.chartHeading, { color: theme.onSurface }]}>دليل الحسابات والأرصدة الحالية</Text>
            <TouchableOpacity
              style={[styles.addAccBtn, { backgroundColor: theme.primary }]}
              onPress={() => setAddAccountModal(true)}
            >
              <MaterialCommunityIcons name="plus" size={16} color={theme.onPrimary} />
              <Text style={[styles.addAccBtnText, { color: theme.onPrimary }]}>حساب جديد</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={trialBalance}
            keyExtractor={item => item.account_id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const typeInfo = getTypeLabel(item.type);
              return (
                <TouchableOpacity
                  style={[styles.accountCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}
                  onPress={() => {
                    setSelectedAccountId(item.account_id);
                    setActiveTab('ledger');
                  }}
                >
                  <View style={styles.accRight}>
                    <View style={[styles.codeBadge, { backgroundColor: `${typeInfo.color}15` }]}>
                      <Text style={[styles.codeText, { color: typeInfo.color }]}>{item.code}</Text>
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text style={[styles.accName, { color: theme.onSurface }]}>{item.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: `${typeInfo.color}15` }]}>
                        <Text style={[styles.typeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.accLeft}>
                    {item.net_debit_cents > 0 ? (
                      <View style={{ alignItems: 'flex-start' }}>
                        <Text style={[styles.balanceVal, { color: theme.primary }]}>{formatCurrency(item.net_debit_cents)}</Text>
                        <Text style={[styles.sideLabel, { color: theme.primary }]}>رصيد مدين</Text>
                      </View>
                    ) : item.net_credit_cents > 0 ? (
                      <View style={{ alignItems: 'flex-start' }}>
                        <Text style={[styles.balanceVal, { color: theme.error }]}>{formatCurrency(item.net_credit_cents)}</Text>
                        <Text style={[styles.sideLabel, { color: theme.error }]}>رصيد دائن</Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'flex-start' }}>
                        <Text style={[styles.balanceVal, { color: theme.onSurfaceVariant }]}>0.00 ₪</Text>
                        <Text style={[styles.sideLabel, { color: theme.onSurfaceVariant }]}>متزن</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <View style={{ flex: 1, padding: 12 }}>
          {/* Account Selector Scroll */}
          <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>اختر الحساب لعرض كشف الحساب ودفتر الأستاذ:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse', marginBottom: 12 }}>
            {accounts.map(acc => {
              const isSel = selectedAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.accChip,
                    isSel ? { backgroundColor: theme.primary } : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Text style={[styles.accChipText, { color: isSel ? theme.onPrimary : theme.onSurface }]}>
                    {acc.code} - {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Ledger Table */}
          <FlatList
            data={ledgerEntries}
            keyExtractor={(item, idx) => idx.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="book-open-blank-variant" size={48} color={theme.outlineVariant} />
                <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>لا توجد حركات مسجلة لهذا الحساب</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.ledgerRow, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.ledgerEntryNum, { color: theme.onSurface }]}>{item.entry_number} • {item.description}</Text>
                  <Text style={[styles.ledgerDate, { color: theme.onSurfaceVariant }]}>
                    {new Date(item.entry_date).toLocaleString('ar-EG')}
                  </Text>
                </View>

                <View style={styles.ledgerAmounts}>
                  {item.debit_cents > 0 ? (
                    <Text style={[styles.ledgerDebit, { color: theme.primary }]}>+ {formatCurrency(item.debit_cents)} (مدين)</Text>
                  ) : null}
                  {item.credit_cents > 0 ? (
                    <Text style={[styles.ledgerCredit, { color: theme.error }]}>- {formatCurrency(item.credit_cents)} (دائن)</Text>
                  ) : null}
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* Add Sub-Account Modal */}
      <Modal visible={addAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>إضافة حساب جديد إلى الدليل المحاسبي</Text>
              <TouchableOpacity onPress={() => setAddAccountModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>نوع وطبيعة الحساب</Text>
              <View style={styles.typeGrid}>
                {[
                  { key: 'asset', label: 'أصل (Asset)' },
                  { key: 'liability', label: 'خصم / التزام (Liability)' },
                  { key: 'equity', label: 'حقوق ملكية (Equity)' },
                  { key: 'revenue', label: 'إيراد (Revenue)' },
                  { key: 'expense', label: 'مصروف (Expense)' },
                ].map(t => {
                  const isSel = newAccType === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.typeOption,
                        isSel ? { backgroundColor: theme.primary } : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                      ]}
                      onPress={() => setNewAccType(t.key as any)}
                    >
                      <Text style={[styles.typeOptionText, { color: isSel ? theme.onPrimary : theme.onSurface }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>رقم / كود الحساب *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="مثال: 1105 أو 5205"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="numeric"
                value={newAccCode}
                onChangeText={setNewAccCode}
              />

              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>اسم الحساب *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="مثال: حساب البنك الإسلامي، أو عهدة الموظفين"
                placeholderTextColor={theme.onSurfaceVariant}
                value={newAccName}
                onChangeText={setNewAccName}
              />

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveAccount}>
                <MaterialCommunityIcons name="check" size={20} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>حفظ الحساب</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Manual Journal Entry Modal */}
      <Modal visible={addEntryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>إنشاء قيد يومية محاسبي مزدوج (متوازن)</Text>
              <TouchableOpacity onPress={() => setAddEntryModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>البيان / شرح القيد *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="شرح العملية المحاسبية"
                placeholderTextColor={theme.onSurfaceVariant}
                value={entryDesc}
                onChangeText={setEntryDesc}
              />

              <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>المبلغ (₪) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceContainerLow, color: theme.onSurface, borderColor: theme.outlineVariant }]}
                placeholder="0.00"
                placeholderTextColor={theme.onSurfaceVariant}
                keyboardType="numeric"
                value={entryAmount}
                onChangeText={setEntryAmount}
              />

              {/* Debit Side */}
              <Text style={[styles.label, { color: theme.primary, fontWeight: 'bold' }]}>الطرف المدين (من حـ / ) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                {accounts.map(acc => {
                  const isSel = debitAccId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accChip,
                        isSel ? { backgroundColor: theme.primary } : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                      ]}
                      onPress={() => setDebitAccId(acc.id)}
                    >
                      <Text style={[styles.accChipText, { color: isSel ? theme.onPrimary : theme.onSurface }]}>
                        {acc.code} - {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Credit Side */}
              <Text style={[styles.label, { color: theme.error, fontWeight: 'bold' }]}>الطرف الدائن (إلى حـ / ) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                {accounts.map(acc => {
                  const isSel = creditAccId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accChip,
                        isSel ? { backgroundColor: theme.error } : { backgroundColor: theme.surfaceContainerLow, borderColor: theme.outlineVariant, borderWidth: 1 },
                      ]}
                      onPress={() => setCreditAccId(acc.id)}
                    >
                      <Text style={[styles.accChipText, { color: isSel ? '#ffffff' : theme.onSurface }]}>
                        {acc.code} - {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveJournalEntry}>
                <MaterialCommunityIcons name="check-all" size={20} color={theme.onPrimary} />
                <Text style={[styles.saveBtnText, { color: theme.onPrimary }]}>ترحيل القيد المزدوج</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row-reverse', padding: 6, margin: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  tabItem: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  tabText: { fontSize: 11, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic' },
  chartTopRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  chartHeading: { fontSize: 14, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic' },
  addAccBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addAccBtnText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  accountCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  accRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  codeBadge: { width: 44, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  accName: { fontSize: 13, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-end' },
  typeText: { fontSize: 10, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  accLeft: { alignItems: 'flex-start' },
  balanceVal: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  sideLabel: { fontSize: 10, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  sectionTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginBottom: 6 },
  accChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 6 },
  accChipText: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  ledgerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  ledgerEntryNum: { fontSize: 13, fontWeight: '700', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  ledgerDate: { fontSize: 10, fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  ledgerAmounts: { alignItems: 'flex-start', gap: 2 },
  ledgerDebit: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  ledgerCredit: { fontSize: 13, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 13, fontFamily: 'IBM Plex Sans Arabic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right' },
  label: { fontSize: 12, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic', textAlign: 'right', marginTop: 4 },
  typeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  typeOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  typeOptionText: { fontSize: 11, fontWeight: '600', fontFamily: 'IBM Plex Sans Arabic' },
  input: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, textAlign: 'right', fontSize: 13, fontFamily: 'IBM Plex Sans Arabic' },
  saveBtn: { height: 46, borderRadius: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 20 },
  saveBtnText: { fontSize: 14, fontWeight: 'bold', fontFamily: 'IBM Plex Sans Arabic' },
});
