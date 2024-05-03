import { db } from '../../../../database/db.js';
import Logger from '../../../../utils/logger.js';
import client from '../bot_handler.js';
import pkg from 'discord.js';
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = pkg;

const monitors = {};

// Handles the /start command
export async function handleStartCommand(message) {
    message.channel.send('Please send me the URL you want to monitor. 🛒');
}

// Handles messages that are HTTP URLs
export async function handleHttpMessage(message, vintedMonitoringService) {
    try {
        const text = message.content;
        const database = await db;
        await database.run(`INSERT INTO user_urls (chat_id, url) VALUES (?, ?) ON CONFLICT(chat_id) DO UPDATE SET url = excluded.url`, [message.author.id, text]);

        if (monitors[message.author.id]) {
            monitors[message.author.id].stopMonitoring();
            delete monitors[message.author.id];
        }

        const vintedMonitor = vintedMonitoringService.startMonitoring(text, (items) => {
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
                
                const channel = client.channels.cache.get(message.channel.id);
                    
                channel.send({ embeds: [embed], components: [row]});
            });
        });

        message.channel.send('Started monitoring the Vinted URL. 🛒');

        monitors[message.author.id] = vintedMonitor;
    } catch (error) {
        Logger.error(`Monitoring error: ${error.message}`);
    }
}

// Handles the /stop command
export async function handleStopCommand(message) {
    if (monitors[message.author.id]) {
        monitors[message.author.id].stopMonitoring();
        delete monitors[message.author.id];
        message.channel.send('Stopped monitoring the Vinted URL. 🛒');
    } else {
        message.channel.send('You are not monitoring any URL. Please use /start to monitor a URL.');
    }
}

// Handles unknown commands or text
export async function handleUnknownCommand(message) {
    const channel = client.channels.cache.get(message.channel.id);

    channel.send("I didn't understand that. Please send a valid URL or use /start, /stop to manage monitoring.");
}
