import TelegramBot from 'node-telegram-bot-api';
import handleMessage from './handlers/message_handler.js';
import handleCallback from './handlers/callback_handler.js';
import ProxyHandler from '../../handlers/proxy_handler.js';
import { db } from '../../database/db.js';
import ConfigurationManager from '../../utils/config_manager.js';
import Logger from '../../utils/logger.js';

// Load the configuration
const configManager = new ConfigurationManager(process.cwd() + '/config.yaml');

// Token and proxy details are set here.
const token = configManager.getTelegramToken();
const proxies = configManager.getProxies();
const proxyHandler = new ProxyHandler(proxies);

const bot = new TelegramBot(token, { polling: true });

Logger.info('Bot started');

bot.on('message', (msg) => handleMessage(bot, msg, proxyHandler));
bot.on('callback_query', (callbackQuery) => handleCallback(bot, callbackQuery, proxyHandler));

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
        process.exit();
    }
});

Logger.info('Bot is ready to receive messages');
