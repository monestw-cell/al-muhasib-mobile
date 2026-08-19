import { queryAll, executeSql } from '../db/database';
import { User } from './auth.service';
import { hashPassword } from '../utils/security';

export const UsersService = {
  getAll: async (): Promise<User[]> => {
    return await queryAll<User>('SELECT id, username, full_name, role, active FROM users ORDER BY id ASC');
  },

  addUser: async (username: string, password: string, fullName: string, role: User['role']): Promise<number> => {
    const passwordHash = await hashPassword(password);
    const res = await executeSql(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [username, passwordHash, fullName, role]
    );
    return res.insertId;
  },

  updateUser: async (id: number, fullName: string, role: User['role'], active: number): Promise<void> => {
    await executeSql(
      'UPDATE users SET full_name = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [fullName, role, active, id]
    );
  },

  updateAvatar: async (userId: number, avatarPath: string): Promise<void> => {
    await executeSql(
      'UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [avatarPath, userId]
    );
  },

  checkPermission: (userRole: User['role'], requiredPermission: string): boolean => {
    if (userRole === 'admin') return true;

    const rolePermissions: Record<User['role'], string[]> = {
      admin: ['*'],
      supervisor: ['pos', 'products', 'inventory', 'customers', 'suppliers', 'purchases', 'expenses', 'reports', 'cash'],
      accountant: ['reports', 'sales', 'purchases', 'expenses', 'customers', 'suppliers', 'cash'],
      inventory_manager: ['products', 'categories', 'inventory', 'purchases', 'suppliers'],
      cashier: ['pos', 'products', 'customers', 'own_sales', 'print_receipt'],
    };

    const allowed = rolePermissions[userRole] || [];
    return allowed.includes('*') || allowed.includes(requiredPermission);
  },
};
