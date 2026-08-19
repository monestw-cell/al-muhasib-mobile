import { queryFirst } from '../db/database';
import { verifyPassword, saveSession, clearSession, getSession } from '../utils/security';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'accountant' | 'inventory_manager' | 'supervisor';
  avatar_path?: string;
  active: number;
}

export const AuthService = {
  login: async (username: string, password: string): Promise<User | null> => {
    const user = await queryFirst<User & { password_hash: string }>(
      'SELECT * FROM users WHERE username = ? AND active = 1',
      [username]
    );

    if (!user) return null;

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return null;

    const token = JSON.stringify({ id: user.id, username: user.username, role: user.role });
    await saveSession(token);

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      avatar_path: user.avatar_path || '',
      active: user.active,
    };
  },

  getCurrentUser: async (): Promise<User | null> => {
    const sessionStr = await getSession();
    if (!sessionStr) return null;

    try {
      const parsed = JSON.parse(sessionStr);
      const user = await queryFirst<User>('SELECT id, username, full_name, role, avatar_path, active FROM users WHERE id = ?', [parsed.id]);
      return user || null;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await clearSession();
  },
};
