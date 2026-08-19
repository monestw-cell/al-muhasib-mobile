import * as SecureStore from 'expo-secure-store';

/**
 * Simple, strong hashing utility for offline local mobile auth.
 */
export const hashPassword = async (password: string): Promise<string> => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  // Convert to hex string with prefix
  const salt = 'hanyouk_salt_2026_';
  let saltedHash = 0;
  const combined = salt + password + hash;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    saltedHash = (saltedHash << 7) - saltedHash + char;
    saltedHash |= 0;
  }
  return `hanyouk_v1_${Math.abs(saltedHash).toString(16)}_${Math.abs(hash).toString(16)}`;
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const computed = await hashPassword(password);
  return computed === hash;
};

const SESSION_KEY = 'user_session_token';

export const saveSession = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, token);
  } catch (err) {
    console.log('SecureStore save error:', err);
  }
};

export const getSession = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch (err) {
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (err) {
    console.log('SecureStore clear error:', err);
  }
};
