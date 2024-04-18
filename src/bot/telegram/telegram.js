import TelegramBot from 'node-telegram-bot-api';
import { config } from 'dotenv';
import { VintedMonitor } from '../../monitors/vinted_monitor.js';
import { ProxyHandler } from '../../utils/proxys.js';

// Load environment variables
config();
config({ path: `.env.local`, override: true });

const env = process.env;
const country_code = env.COUNTRY_CODE;
const selenium_enabled = env.USE_SELENIUM === 'true';

// Telegram configuration
const LIMIT_TELEGRAM_MESSAGES = env.LIMIT_TELEGRAM_MESSAGES === 'true';
const TELEGRAM_MESSAGE_LIMIT = parseInt(env.TELEGRAM_MESSAGE_LIMIT, 10);

const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    console.error("Please provide a Telegram bot token in the .env file.");
    process.exit(1);
}

const defaultConfig = {
    search_text: env.SEARCH_TEXT,
    type: env.TYPE,
    catalog : env.CATALOG,
    sizes : env.SIZES.split(',').map(size => size.trim()),
    brands: env.BRANDS.split(',').map(brand => brand.trim()),
    priceFrom: parseInt(env.PRICE_FROM, 10),
    priceTo: parseInt(env.PRICE_TO, 10)
}

class BotManager {
    constructor() {
        try {
            this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
        } catch (error) {
            console.error("Your telegram bot token is invalid. Please check the .env file.");
            process.exit(1);
        }

        this.userConfigs = {};
        this.monitors = {};  // Stores VintedMonitor instances per chatId
        this.baseConfig = { ...defaultConfig };

        this.commands = {}

        this.registerCommands();
    }

    // Initialize VintedMonitor for a specific chatId
    async initializeMonitor(chatId) {
        const config = this.userConfigs[chatId] || { ...this.baseConfig };
        const monitor = new VintedMonitor();
        monitor.setCountryCode(country_code);
        monitor.useSelenium(selenium_enabled);
        
        // Setup proxy if required
        if (env.PROXY_ENABLED === 'true') {
            monitor.useProxy(new ProxyHandler(
                env.PROXY_PROTOCOL,
                env.PROXY_IP,
                env.PROXY_PORT,
                env.PROXY_USERNAME,
                env.PROXY_PASSWORD
            ));
        }

        await monitor.configure(config);
        this.monitors[chatId] = monitor;
    }

    // Start monitoring items
    async startMonitoring(chatId) {
        if (!this.monitors[chatId]) {
            await this.initializeMonitor(chatId);
        }
        this.monitors[chatId].startMonitoring(items => {
            if (LIMIT_TELEGRAM_MESSAGES && items.length > TELEGRAM_MESSAGE_LIMIT) {
                this.bot.sendMessage(chatId, `Found ${items.length} new items. Showing first ${TELEGRAM_MESSAGE_LIMIT} items.`);
                items = items.slice(0, TELEGRAM_MESSAGE_LIMIT);
            }

            items.forEach(item => {
                console.log(`New item found: ${item.title}`);
                const brands = `👕 Brands: ${item.brand}`
                const sizes = `📏 Sizes: ${item.size}`;
                const price = `💰 Price: ${item.price} ${env.COUNTRY_CURRENCY}`;

                const caption = `👟 ${item.title}\n${brands}\n${sizes}\n${price}`;

                const opts = {
                    parse_mode: 'Markdown', 
                    caption: caption,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔗 View on Vinted', url: item.url }
                        ]]
                    }
                };
                if (item.imageUrl) {
                    this.bot.sendPhoto(chatId, item.imageUrl, opts);
                } else {
                    this.bot.sendMessage(chatId, caption, { // Send a regular message if no image URL
                        reply_markup: opts.reply_markup
                    });
                }
            });
        }, 5000); // Check every 5 seconds
        this.bot.sendMessage(chatId, "Monitoring has started.");
    }

    // Stop monitoring items
    stopMonitoring(chatId) {
        if (this.monitors[chatId]) {
            this.monitors[chatId].stopMonitoring();
            delete this.monitors[chatId];  // Remove the monitor instance
            this.bot.sendMessage(chatId, "Monitoring has been stopped.");
        }
    }

    addCommand(command, description, example) {
        this.commands[command] = { description, example };
    }

    registerCommands() {
        this.bot.onText(/\/help/, (msg) => this.showHelp(msg));

        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        this.bot.onText(/\/watch/, (msg) => this.startMonitoring(msg.chat.id));
        this.bot.onText(/\/stop/, (msg) => this.stopMonitoring(msg.chat.id));

        this.addCommand('search', 'Set the search text for items.', '/setSearch Pull');
        this.bot.onText(/\/setSearch (.+)/, (msg, match) => this.setConfig(msg.chat.id, 'search_text', match[1], '/setSearch Pull'));

        this.addCommand('type', 'Set the type of items to search for.', '/setType "Hommes"');
        this.bot.onText(/\/setType (.+)/, (msg, match) => this.setConfig(msg.chat.id, 'type', match[1], '/setType Hommes'));

        this.addCommand('catalog', 'Set the catalog of items to search for.', '/setCatalog "Vêtements"');
        this.bot.onText(/\/setCatalog (.+)/, (msg, match) => this.setConfig(msg.chat.id, 'catalog', match[1], '/setCatalog Vêtements'));

        this.addCommand('sizes', 'Set the sizes to search for.', '/setSizes "S, M, L"');
        this.bot.onText(/\/setSizes (.+)/, (msg, match) => this.setConfig(msg.chat.id, 'sizes', match[1], '/setSizes S, M, L', true));

        this.addCommand('brands', 'Set the brands to search for.', '/setBrands "Nike, Adidas, Puma"');
        this.bot.onText(/\/setBrands (.+)/, (msg, match) => this.setConfig(msg.chat.id, 'brands', match[1], '/setBrands Nike, Adidas, Puma', true));

        this.addCommand('priceFrom', 'Set the minimum price for items.', '/setPriceFrom 10');
        this.bot.onText(/\/setPriceFrom (.+)/, (msg, match) => this.setConfig(msg.chat.id, 'priceFrom', match[1], '/setPriceFrom 10'));

        this.addCommand('priceTo', 'Set the maximum price for items.', '/setPriceTo 100');
        this.bot.onText(/\/setPriceTo (.+)/, (msg, match) => this.setConfig(msg.chat.id, 'priceTo', match[1], '/setPriceTo 100'));

        this.addCommand('config', 'Show the current configuration.', '/showConfig');
        this.bot.onText(/\/showConfig/, (msg) => this.showConfig(msg.chat.id));

        this.addCommand('help', 'Show available commands.', '/help');
        this.bot.onText(/\/help/, (msg) => this.showHelp(msg));
    }

    setConfig(chatId, key, value, example, list = false, separator = ',') {
        if (!this.userConfigs[chatId]) {
            this.userConfigs[chatId] = { ...this.baseConfig };
        }

        if (list) {
            value = value.split(separator).map(item => item.trim());
        }

        this.userConfigs[chatId][key] = value;
        this.bot.sendMessage(chatId, `Set ${key} to ${value}.`);
    }

    showConfig(chatId) {
        const config = this.userConfigs[chatId] || { ...this.baseConfig };
        let message = "Current configuration:\n\n";

        for (let key in config) {
            message += `*${key}*: ${config[key]}\n`;
        }

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    showHelp(msg) {
        const chatId = msg.chat.id;
        let message = "Available commands:\n";

        // Use markdown for formatting
        for (let command in this.commands) {
            const { description, example } = this.commands[command];
            message += `*${command}*: ${description}\nExample: ${example}\n\n`;
        }

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    handleStart(msg) {
        const chatId = msg.chat.id;
        if (!this.userConfigs[chatId]) {
            this.userConfigs[chatId] = { ...this.baseConfig };
        }

        // Use markdown for formatting
        const welcomeMessage = `Welcome to Vinted Monitor Bot! 🎉\n\nYou can use the following commands to configure the bot:\n\n/help\n/showConfig\n/watch\n\nUse /help to see all available commands.`
        this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }
}

export { BotManager };
