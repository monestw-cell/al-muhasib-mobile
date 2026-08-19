import { initDatabase } from '../db/database';
import { seedDatabase } from '../db/seed';

export const DatabaseService = {
  initialize: async () => {
    await initDatabase();
    await seedDatabase();
  },
};
