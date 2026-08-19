import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { executeSql } from '../db/database';

export const BackupService = {
  createBackup: async (): Promise<string | null> => {
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/al_muhasib_al_hanyouk.db`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${FileSystem.documentDirectory}hanyouk_backup_${timestamp}.db`;

      const exists = await FileSystem.getInfoAsync(dbPath);
      if (!exists.exists) {
        throw new Error('ملف قاعدة البيانات غير موجود');
      }

      await FileSystem.copyAsync({ from: dbPath, to: backupPath });

      // Save metadata
      await executeSql('INSERT INTO backups (file_path, note) VALUES (?, ?)', [
        backupPath,
        `نسخة احتياطية بتاريخ ${timestamp}`,
      ]);

      // Share backup file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupPath);
      }

      return backupPath;
    } catch (error) {
      console.error('Backup error:', error);
      return null;
    }
  },

  restoreBackup: async (): Promise<boolean> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return false;
      }

      const pickedFile = result.assets[0];
      const targetDbPath = `${FileSystem.documentDirectory}SQLite/al_muhasib_al_hanyouk.db`;

      // Copy picked file to DB location
      await FileSystem.copyAsync({ from: pickedFile.uri, to: targetDbPath });

      return true;
    } catch (error) {
      console.error('Restore error:', error);
      return false;
    }
  },
};
