import pkg from 'discord.js';
const { Client, GatewayIntentBits } = pkg;
import ConfigurationManager from '../../../utils/config_manager.js';
import { handleMessage } from './message_handler.js';
import Logger from '../../../utils/logger.js';

// Token and configuration details
const configManager = new ConfigurationManager(process.cwd() + '/config.yaml');
const token = configManager.getDiscordToken();

// Client initialization
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    Logger.info('Bot is ready to receive messages');
});

import VintedMonitoringService from '../../../services/vinted_monitoring_service.js';
const vintedMonitoringService = new VintedMonitoringService();

client.on('messageCreate', async (message) => {
    if (!message.author.bot) {
        handleMessage(message, vintedMonitoringService);
    }
});

client.login(token);

export default client;
