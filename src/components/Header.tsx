import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface HeaderProps {
  title: string;
  onSearchPress?: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onSearchPress, showBack, onBackPress }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.outlineVariant }]}>
      <View style={styles.rightSection}>
        {showBack && (
          <TouchableOpacity style={styles.iconBtn} onPress={onBackPress}>
            <MaterialCommunityIcons name="arrow-right" size={24} color={theme.onSurface} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: theme.onSurface }]}>{title}</Text>
      </View>

      <View style={styles.leftSection}>
        {onSearchPress && (
          <TouchableOpacity style={styles.iconBtn} onPress={onSearchPress}>
            <MaterialCommunityIcons name="magnify" size={22} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        )}
        {user?.avatar_path ? (
          <Image source={{ uri: user.avatar_path }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'م'}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  rightSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  leftSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
