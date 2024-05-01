import TelegramBot from 'node-telegram-bot-api';
import { handleMessage, supportMessage } from './handlers/message_handler.js';
import handleCallback from './handlers/callback_handler.js';
import { db } from '../../database/db.js';
import Logger from '../../utils/logger.js';
import VintedMonitoringService from '../../services/vinted_monitoring_service.js';
import ConfigurationManager from '../../utils/config_manager.js';

// Token and proxy details are set here.
const configManager = new ConfigurationManager(process.cwd() + '/config.yaml');
const token = configManager.getTelegramToken();

const vintedMonitoringService = new VintedMonitoringService();

const bot = new TelegramBot(token, { polling: true });

Logger.info('Bot started');

bot.on('message', (msg) => handleMessage(bot, msg, vintedMonitoringService));
bot.on('callback_query', (callbackQuery) => handleCallback(bot, callbackQuery, vintedMonitoringService));

Logger.info('Bot event listeners registered');

// Send support message to all users every 24 hours
setInterval(() => supportMessage(bot), 1000 * 60 * 15);  

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
        process.exit();
    }
});

Logger.info('Bot is ready to receive messages');
