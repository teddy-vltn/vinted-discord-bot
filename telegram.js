import TelegramBot from 'node-telegram-bot-api';
import { VintedMonitor } from './src/monitors/vinted_monitor.js';
import fs from 'fs';

// get token from config.json
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const token = config["telegram_token"];

const bot = new TelegramBot(token, {polling: true});
let userConfigs = {};
let monitors = {};
let itemsStorage = {};

const baseConfig = {
    order: 'newest_first',
    type: 'Hommes',
    catalog: 'Vêtements',
    brands: ["Nike"],
    sizes: ["XS"],
    priceFrom: 10,
    priceTo: 100
};

function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');  // Escaping special characters for Markdown
}

// Function to construct a readable configuration message
function parseConfig(config) {
    return `*Configuration:*\n` +
           `- *Order:* ${escapeMarkdown(config.order)}\n` +
           `- *Catalog:* ${escapeMarkdown(config.catalog)}\n` +
           `- *Brands:* ${config.brands.map(escapeMarkdown).join(', ')}\n` +
           `- *Sizes:* ${config.sizes.map(escapeMarkdown).join(', ')}\n` +
           `- *Price Range:* ${config.priceFrom} - ${config.priceTo}`;
}

// Start command listener
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!userConfigs[chatId]) {
        userConfigs[chatId] = { ...baseConfig };
    }
  // Welcome message with detailed instructions
  const welcomeMessage = `
Welcome to the Vinted Monitor Bot! 🎉 Here's how you can use me to track new listings:

1. **Set Your Brands**: Specify which brands you're interested in by using the command \`/setbrands brand1, brand2\`.
2. **Set Your Sizes**: Define the sizes you are looking for with \`/setsizes XS, S, M, L\`.
3. **Set Price Range**: Limit the price range with \`/setprice min-max\` (e.g., \`/setprice 10-100\`).
4. **Start Monitoring**: Once configured, use \`/configure\` to apply your settings and start monitoring.
5. **Stop Monitoring**: Use \`/stop\` to pause the monitoring anytime.

Example commands:
- \`/setbrands Nike, Adidas\`
- \`/setsizes XS, S\`
- \`/setprice 10-150\`
- \`/watch\`
- \`/stop\`

Get real-time updates directly here as soon as new items matching your preferences are listed. Happy hunting! 😊
`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// Display current configuration
bot.onText(/\/config/, (msg) => {
    const chatId = msg.chat.id;
    if (userConfigs[chatId]) {
        const config = userConfigs[chatId];
        bot.sendMessage(chatId, parseConfig(config), { parse_mode: 'Markdown' });
    }
});

// Configure and start monitoring
bot.onText(/\/watch/, async (msg) => {
    const chatId = msg.chat.id;
    if (userConfigs[chatId] && !monitors[chatId]) {
        const config = userConfigs[chatId];
        monitors[chatId] = new VintedMonitor('https://www.vinted.fr');
        monitors[chatId].useSelenium(true); // Use Vinted's API
        await monitors[chatId].configure({
            order: 'newest_first',
            type: 'Hommes',
            catalog: config.catalog,
            brands: config.brands,
            sizes: config.sizes,
            priceFrom: config.priceFrom,
            priceTo: config.priceTo
        });
        // Start monitoring with pretty output
        monitors[chatId].startMonitoring(newItems => {
            itemsStorage[chatId] = newItems;  // Store new items under user's chatId
        
            let i = 0;
            newItems.forEach(item => {
                if (i++ > 5) return;  // Limit to 5 items for now
                const caption = `*New Item Found:*\n` +
                    `*Brand:* ${item.brand}\n` +
                    `*Size:* ${item.size}\n` +
                    `*Price:* ${item.price}\n` +
                    `*URL:* [Link](${item.url})`;
                
                const opts = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Get More Info", callback_data: `info_${chatId}_${i-1}` }]  // Pass index in storage
                        ]
                    }
                };
        
                if (item.imageUrl) {
                    bot.sendPhoto(chatId, item.imageUrl, { caption, ...opts });
                } else {
                    bot.sendMessage(chatId, caption, opts);
                }
            });
        }, 5000);
        bot.sendMessage(chatId, "Monitoring started with your configuration.");
    } else {
        bot.sendMessage(chatId, "You already have a monitoring session running or need to set up your configuration.");
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const parts = action.split('_');
    const command = parts[0];
    const itemIndex = parseInt(parts[2], 10);  // Get the index of the item

    if (command === 'info') {
        const item = itemsStorage[chatId][itemIndex];  // Retrieve the item from storage
        const monitor = monitors[chatId];

        bot.sendMessage(chatId, `Fetching more info about the item...`);

        item.getMoreInfo(monitor.driver).then((item) => {

            const infoMessage = `*More About the Item:*\n` +
                `*Description:* ${item.desc}\n` +
                `*Rating:* ${item.rating} stars\n` +
                `*Votes:* ${item.votes}`;

            bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' });

        }).catch(error => {
            console.error("Error fetching more info:", error);
            bot.sendMessage(chatId, "Error fetching more info.");
        });
    }
});



// Stop monitoring
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    if (monitors[chatId]) {
        monitors[chatId].stopMonitoring();
        monitors[chatId] = null; // Remove the monitor instance
        bot.sendMessage(chatId, "Monitoring has been stopped.");
    } else {
        bot.sendMessage(chatId, "No monitoring session to stop.");
    }
});

// Set brands
bot.onText(/\/setbrands (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const brands = match[1].split(',').map(brand => brand.trim());
    if (userConfigs[chatId]) {
        userConfigs[chatId].brands = brands;
        bot.sendMessage(chatId, `Your brand preferences have been set to: ${brands.join(', ')}`);
    }
});

// Set sizes
bot.onText(/\/setsizes (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const sizes = match[1].split(',').map(size => size.trim());
    if (userConfigs[chatId]) {
        userConfigs[chatId].sizes = sizes;
        bot.sendMessage(chatId, `Your size preferences have been set to: ${sizes.join(', ')}`);
    }
});

// Set price range
bot.onText(/\/setprice (.+)-(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const priceFrom = parseFloat(match[1]);
    const priceTo = parseFloat(match[2]);
    if (userConfigs[chatId]) {
        userConfigs[chatId].priceFrom = priceFrom;
        userConfigs[chatId].priceTo = priceTo;
        bot.sendMessage(chatId, `Your price range has been set from ${priceFrom} to ${priceTo}`);
    }
});

// Set catalog
bot.onText(/\/setcatalog (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const catalog = match[1];
    if (userConfigs[chatId]) {
        userConfigs[chatId].catalog = catalog;
        bot.sendMessage(chatId, `Your catalog preference has been set to: ${catalog}`);
    }
});
  