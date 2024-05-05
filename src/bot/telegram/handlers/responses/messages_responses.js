import { db } from '../../../../database/db.js';
import Logger from '../../../../utils/logger.js';

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
        
        vintedMonitoringService.startMonitoring(text, chatId, (items) => {
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

    } catch (error) {
        Logger.error(`Monitoring error: ${error.message}`);
        bot.sendMessage(chatId, 'Error processing your request. Please try again.', {
            parse_mode: 'HTML'
        });
    }
}

// Handles the /stop command
export async function handleStopCommand(bot, chatId, vintedMonitoringService) {
    if (vintedMonitoringService.isMonitoring(chatId)) {
        vintedMonitoringService.stopMonitoring(chatId);
        bot.sendMessage(chatId, 'Monitoring stopped. 🛒', {
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
        vintedMonitoringService.startMonitoring(url, chatId, (items) => {
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


const github_link = "https://github.com/teddy-vltn/vinted-monitor"
export async function sendSupportReminderGithub(bot) {
    Object.keys(monitors).forEach(chatId => {
        bot.sendMessage(chatId, "This is a free bot! ⭐️ Support us by starring our GitHub repo: " + github_link, {
            parse_mode: 'Markdown',
        }).catch(error => {
            Logger.error(`Failed to send message to chat ${chatId}: ${error.message}`);
            // Consider removing chatId from monitors if the bot is blocked or chat is not found
            if (error.code === 403) { // 'Forbidden: bot was blocked by the user'
                delete monitors[chatId];
                Logger.info(`Removed chat ${chatId} from monitoring due to block.`);
            }
        });
    });

    Logger.info("Support reminder sent to all chats");
}