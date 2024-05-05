import pkg from 'discord.js';
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = pkg;
import ConfigurationManager from '../../../utils/config_manager.js';
import { handleMessage } from './message_handler.js';  // Ensure startMonitoringForChannel is exported
import Logger from '../../../utils/logger.js';
import { db } from '../../../database/db.js';

// Token and configuration details
const configManager = new ConfigurationManager(process.cwd() + '/config.yaml');
const token = configManager.getDiscordToken();

// Client initialization
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

import VintedMonitoringService from '../../../services/vinted_monitoring_service.js';
const vintedMonitoringService = new VintedMonitoringService();

client.once('ready', async () => {
    Logger.info('Bot is ready to receive messages');
    
    const database = await db;

    // chekc if the table exists
    const tableExists = await database.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='channel_urls'`);
    if (!tableExists) {
        await database.run(`CREATE TABLE channel_urls (channel_id TEXT PRIMARY KEY, url TEXT)`);
    }

    const rows = await database.all(`SELECT channel_id, url FROM channel_urls`);
    rows.forEach(row => {

        const channel = client.channels.cache.get(row.channel_id);

        if (!channel) {
            Logger.error(`Channel not found: ${row.channel_id}`);
            return;
        }

        channel.send('Found an existing monitoring URL in the database. 🛒');
        channel.send(`Monitoring URL: ${row.url}`);

        startMonitoringForChannel(row.channel_id, row.url);
    });
});

const monitors = {};

async function startMonitoringForChannel(channelId, url) {
    if (monitors[channelId]) {
        monitors[channelId].stopMonitoring();
        delete monitors[channelId];
    }

    const channel = client.channels.cache.get(channelId);

    channel.send('Monitoring started. 🛒');

    const vintedMonitor = vintedMonitoringService.startMonitoring(url, (items) => {
        items.forEach(item => {
            const embed = new EmbedBuilder()
                .setTitle(item.title)
                .setColor(0x00AE86)
                .setURL(item.url)
                .setFields([
                    { name: '🏷 Price', value: `${item.price} €`, inline: true },
                    { name: '📏 Size', value: item.size, inline: true },
                    { name: '👕 Brand', value: item.brand, inline: true },
                    { name: '🔎 Status', value: item.status, inline: true }
                ])
                .setImage(item.imageUrl)

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('🔗 View Item')
                        .setStyle(ButtonStyle.Link)
                        .setURL(item.url),  // URL to the item
                    new ButtonBuilder()
                        .setLabel('👤 View Seller Profile')
                        .setStyle(ButtonStyle.Link)
                        .setURL(item.profileUrl)  // URL to the seller's profile
                );
                
            channel.send({ embeds: [embed], components: [row]});
        });
    });

    monitors[channelId] = vintedMonitor;
}

async function stopMonitoringForChannel(channelId) {
    if (monitors[channelId]) {
        monitors[channelId].stopMonitoring();
        delete monitors[channelId];

        // remove the URL from the database
        const database = await db;
        await database.run(`DELETE FROM channel_urls WHERE channel_id = ?`, [channelId]);
    }
}

client.on('messageCreate', async (message) => {
    if (!message.author.bot) {
        handleMessage(message);
    }
});

client.login(token);

export { client, startMonitoringForChannel, stopMonitoringForChannel };
