import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface BottomNavProps {
  activeTab: string;
  onTabSelect: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabSelect }) => {
  const { theme } = useTheme();

  const tabs = [
    { key: 'dashboard', label: 'الرئيسية', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'pos', label: 'نقطة البيع', icon: 'calculator-variant-outline', activeIcon: 'calculator-variant' },
    { key: 'products', label: 'المنتجات', icon: 'cube-outline', activeIcon: 'cube' },
    { key: 'reports', label: 'التقارير', icon: 'chart-bar-stacked', activeIcon: 'chart-bar' },
    { key: 'more', label: 'المزيد', icon: 'dots-horizontal', activeIcon: 'dots-horizontal' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.outlineVariant }]}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        const color = isActive ? theme.primary : theme.onSurfaceVariant;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabSelect(tab.key)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={(isActive ? tab.activeIcon : tab.icon) as any}
              size={24}
              color={color}
            />
            <Text
              style={[
                styles.tabLabel,
                { color, fontWeight: isActive ? '700' : '500' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingBottom: 6,
    paddingTop: 4,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'IBM Plex Sans Arabic',
    letterSpacing: -0.2,
  },
});
