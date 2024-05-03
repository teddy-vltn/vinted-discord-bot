import { db } from '../../database/db.js';
import Logger from '../../utils/logger.js';
import client from './handlers/bot_handler.js';

Logger.info('Bot event listeners registered');

// Graceful shutdown
process.on('exit', async () => {
  try {
    const database = await db;
    await database.close();
  } catch (error) {
    Logger.error(error);
  }
});

process.on('SIGINT', async () => {
  try {
      const database = await db;
      await database.close();
  } catch (error) {
      Logger.error(error);
  } finally {
      client.destroy();
      process.exit();
  }
});

Logger.info('Bot is ready to receive messages');

