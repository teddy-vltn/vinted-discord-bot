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

async function sendSupportReminderGithub(channel) {
    const embed = new EmbedBuilder()
        .setTitle('Support the project')
        .setColor(0x00AE86)
        .setDescription('If you like the project, consider starring the repository on GitHub.')
        .setURL('https://github.com/teddy-vltn/vinted-monitor');

    channel.send({ embeds: [embed] });
}

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

        sendSupportReminderGithub(channel);

        //channel.send('Found an existing monitoring URL in the database. 🛒');
        //channel.send(`Monitoring URL: ${row.url}`);

        const embed = new EmbedBuilder()
            .setTitle('Found an existing monitoring URL in the database. 🛒')
            .setDescription(`Monitoring URL: ${row.url}`);

        channel.send({ embeds: [embed] });

        startMonitoringForChannel(row.channel_id, row.url);
    });
});


async function startMonitoringForChannel(channelId, url) {
    const channel = client.channels.cache.get(channelId);

    //channel.send('Monitoring started. 🛒');

    const embed = new EmbedBuilder()
        .setTitle('Monitoring started. 🛒')
        .setDescription(`Monitoring URL: ${url}`);

    channel.send({ embeds: [embed] });

    vintedMonitoringService.startMonitoring(url, channelId, (items) => {
        items.forEach(item => {
            const embed = new EmbedBuilder()
                .setTitle(item.title)
                .setColor(0x00AE86)
                .setURL(item.url)
                .setFields([
                    { name: '🏷 Price', value: `${item.price} €`, inline: true },
                    { name: '📏 Size', value: item.size, inline: true },
                    { name: '👕 Brand', value: item.brand, inline: true },
                    { name: '🔎 Status', value: item.status, inline: true },
                    { name: '📦 Date', value: item.unixTimestampString, inline: true}
                    
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
}

async function stopMonitoringForChannel(channelId) {
    if (vintedMonitoringService.isMonitoring(channelId)) {
        vintedMonitoringService.stopMonitoring(channelId);

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
