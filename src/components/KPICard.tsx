import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface KPICardProps {
  title: string;
  value: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  bgColor?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, iconName, iconColor, bgColor }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest }]}>
      <View style={[styles.iconBox, { backgroundColor: bgColor || `${theme.primary}15` }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={iconColor || theme.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.onSurfaceVariant }]}>{title}</Text>
        <Text style={[styles.value, { color: theme.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    elevation: 2,
    gap: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    gap: 2,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 12,
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
  },
});
