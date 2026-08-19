import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, I18nManager, BackHandler } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../theme/ThemeContext';
import { BottomNav } from '../components/BottomNav';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { POSScreen } from '../screens/POSScreen';
import { ReceiptScreen } from '../screens/ReceiptScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { ProductEditScreen } from '../screens/ProductEditScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { CashScreen } from '../screens/CashScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { SuppliersScreen } from '../screens/SuppliersScreen';
import { PurchasesScreen } from '../screens/PurchasesScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { SalesScreen } from '../screens/SalesScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { Product } from '../services/products.service';
import { SaleRecord } from '../services/sales.service';

export const RootNavigator: React.FC = () => {
  const { theme, mode } = useTheme();
  const { user } = useAuthStore();

  const [history, setHistory] = useState<string[]>(['dashboard']);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentSale, setCurrentSale] = useState<SaleRecord | null>(null);

  const activeTab = history[history.length - 1] || 'dashboard';

  const navigateTo = (tab: string) => {
    if (tab === activeTab) return;
    if (tab === 'dashboard') {
      setHistory(['dashboard']);
    } else {
      setHistory(prev => [...prev, tab]);
    }
  };

  const goBack = (): boolean => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, prev.length - 1));
      return true;
    }
    return false;
  };

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return goBack();
    });
    return () => backSubscription.remove();
  }, [history]);

  useEffect(() => {
    try {
      if (!I18nManager.isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      }
    } catch (e) {
      console.log('RTL error:', e);
    }
  }, []);

  if (!user) {
    return <LoginScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen onNavigate={navigateTo} />;

      case 'pos':
        return (
          <POSScreen
            onSaleComplete={sale => {
              setCurrentSale(sale);
              navigateTo('receipt');
            }}
          />
        );

      case 'receipt':
        return currentSale ? (
          <ReceiptScreen sale={currentSale} onBack={goBack} />
        ) : (
          <DashboardScreen onNavigate={navigateTo} />
        );

      case 'products':
        return (
          <ProductsScreen
            onAddProduct={() => {
              setSelectedProduct(null);
              navigateTo('product_edit');
            }}
            onEditProduct={prod => {
              setSelectedProduct(prod);
              navigateTo('product_edit');
            }}
          />
        );

      case 'product_edit':
        return (
          <ProductEditScreen
            product={selectedProduct}
            onBack={goBack}
          />
        );

      case 'customers':
        return <CustomersScreen onBack={goBack} />;

      case 'suppliers':
        return <SuppliersScreen onBack={goBack} />;

      case 'purchases':
        return <PurchasesScreen onBack={goBack} />;

      case 'inventory':
        return <InventoryScreen onBack={goBack} />;

      case 'sales':
        return (
          <SalesScreen
            onBack={goBack}
            onViewReceipt={sale => {
              setCurrentSale(sale);
              navigateTo('receipt');
            }}
          />
        );

      case 'accounts':
        return <AccountsScreen onBack={goBack} />;

      case 'reports':
        return <ReportsScreen onBack={goBack} />;

      case 'expenses':
        return <ExpensesScreen onBack={goBack} />;

      case 'cash':
        return <CashScreen onBack={goBack} />;

      case 'settings':
        return <SettingsScreen onBack={goBack} />;

      case 'more':
        return <MoreScreen onNavigate={navigateTo} onBack={goBack} />;

      default:
        return <DashboardScreen onNavigate={navigateTo} />;
    }
  };

  const showBottomNav = ['dashboard', 'pos', 'products', 'reports', 'more'].includes(activeTab);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={styles.screenArea}>{renderScreen()}</View>
      {showBottomNav && <BottomNav activeTab={activeTab} onTabSelect={navigateTo} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenArea: {
    flex: 1,
  },
});
