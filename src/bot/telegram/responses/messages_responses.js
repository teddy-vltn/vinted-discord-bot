import VintedMonitor from '../../../monitor/vinted_monitor.js';
import { db } from '../../../database/db.js';
import Logger from '../../../utils/logger.js';

const monitors = {};

// Handles the /start command
export async function handleStartCommand(bot, chatId) {
    try {
        const database = await db;
        const row = await database.get(`SELECT url FROM user_urls WHERE chat_id = ?`, chatId);

        if (row) {
            bot.sendMessage(chatId, `Welcome back! 👋 Do you want to monitor the last URL again? <a href="${row.url}">${row.url}</a>`, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Yes", callback_data: 'yes' }, { text: "No", callback_data: 'no' }]
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, 'Welcome! 👋 Please send me a Vinted URL you would want to monitor.', {
                parse_mode: 'HTML'
            });
        }
    } catch (error) {
        Logger.error(`Database error: ${error.message}`);
        bot.sendMessage(chatId, 'Error accessing the database. Please try again later.', {
            parse_mode: 'HTML'
        });
    }
}

// Handles messages that are HTTP URLs
export async function handleHttpMessage(bot, chatId, text, vintedMonitoringService) {
    try {
        const database = await db;
        await database.run(`INSERT INTO user_urls (chat_id, url) VALUES (?, ?) ON CONFLICT(chat_id) DO UPDATE SET url = excluded.url`, [chatId, text]);
        
        const vintedMonitor = vintedMonitoringService.startMonitoring(text, (items) => {
            items.forEach(item => {
                bot.sendPhoto(chatId, item.imageUrl, {
                    caption: `*${item.title}*\n🏷 Price: *${item.price} €*\n📏 Size: *${item.size}*\n🏷 Brand: *${item.brand}*\n🔎 Status: *${item.status}*`,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔗 View Item", url: item.url }],
                            [{ text: "👤 View Seller Profile", url: item.profileUrl }]
                        ]
                    }
                });
            });
        }); 
        bot.sendMessage(chatId, 'Started monitoring the Vinted URL. 🛒', {
            parse_mode: 'HTML'
        });

        monitors[chatId] = vintedMonitor;
    } catch (error) {
        Logger.error(`Monitoring error: ${error.message}`);
        bot.sendMessage(chatId, 'Error processing your request. Please try again.', {
            parse_mode: 'HTML'
        });
    }
}

// Handles the /stop command
export async function handleStopCommand(bot, chatId) {
    try {
        const vintedMonitor = monitors[chatId];

        vintedMonitor.stopMonitoring();
        bot.sendMessage(chatId, 'Stopped monitoring. ✋', {
            parse_mode: 'HTML'
        });
        
    } catch (error) {
        Logger.error(`Monitoring error: ${error.message}`);
        bot.sendMessage(chatId, 'Error stopping the monitoring. Please try again.', {
            parse_mode: 'HTML'
        });
    }
}

// Handles unknown commands or text
export async function handleUnknownCommand(bot, chatId) {
    bot.sendMessage(chatId, "I didn't understand that. Please send a valid URL or use /start, /stop to manage monitoring.", {
        parse_mode: 'HTML'
    });
}

// Handles the 'yes' callback from inline keyboard on the start command
export async function handleYesCallback(bot, chatId, message, vintedMonitoringService) {
    try {
        const url = message.text.match(/again\? (.*)/)[1]; // Extract URL from message
        const vintedMonitor = vintedMonitoringService.startMonitoring(url, (items) => {
                items.forEach(item => {
                    bot.sendPhoto(chatId, item.imageUrl, {
                        caption: `*${item.title}*\n🏷 Price: *${item.price} €*\n📏 Size: *${item.size}*\n🏷 Brand: *${item.brand}*\n🔎 Status: *${item.status}*`,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "🔗 View Item", url: item.url }],
                                [{ text: "👤 View Seller Profile", url: item.profileUrl }]
                            ]
                        }
                    });
                });
            });
        monitors[chatId] = vintedMonitor;
        bot.sendMessage(chatId, 'Started monitoring the Vinted URL. 🛒', {
            parse_mode: 'HTML'
        });
    } catch (error) {
        Logger.error(`Monitoring error: ${error.message}`);
        bot.sendMessage(chatId, 'Error starting the monitoring. Please try again.', {
            parse_mode: 'HTML'
        });
    }
}
   

// Handles the 'no' callback from inline keyboard on the start command
export async function handleNoCallback(bot, chatId) {
    bot.sendMessage(chatId, 'Please send me a Vinted URL to start monitoring.', {
        parse_mode: 'HTML'
    });
}


