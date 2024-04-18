import TelegramBot from 'node-telegram-bot-api';
import { config } from 'dotenv';
import { VintedMonitor } from '../monitors/vinted_monitor.js';
import { ProxyHandler } from '../utils/proxys.js';

// Load environment variables
config();
config({ path: `.env.local`, override: true });

const env = process.env;

class BotManager {
    constructor() {
        this.token = env.TELEGRAM_BOT_TOKEN;
        this.bot = new TelegramBot(this.token, { polling: true });
        this.userConfigs = {};
        this.monitors = {};  // Stores VintedMonitor instances per chatId
        this.baseConfig = {
            country: env.COUNTRY_CODE,
            useSelenium: env.USE_SELENIUM === 'true',
            search_text: env.SEARCH_TEXT,
            order: env.ORDER,
            brands: env.BRANDS.split(',').map(brand => brand.trim()),
            priceFrom: parseInt(env.PRICE_FROM, 10),
            priceTo: parseInt(env.PRICE_TO, 10)
        };
        this.registerCommands();
    }

    // Initialize VintedMonitor for a specific chatId
    initializeMonitor(chatId) {
        const config = this.userConfigs[chatId] || { ...this.baseConfig };
        const monitor = new VintedMonitor();
        monitor.setCountryCode(config.country);
        monitor.useSelenium(config.useSelenium);
        
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

        monitor.configure(config);
        this.monitors[chatId] = monitor;
    }

    // Start monitoring items
    startMonitoring(chatId) {
        if (!this.monitors[chatId]) {
            this.initializeMonitor(chatId);
        }
        this.monitors[chatId].startMonitoring(items => {
            // Code to send new items to chat
            items.forEach(item => {
                const message = `New item found:\nBrand: ${item.brand}\nPrice: ${item.price}\nSize: ${item.size}\nURL: ${item.url}\nImage: ${item.imageUrl}\nOwner: ${item.owner}\nOwner ID: ${item.ownerId}\nDescription: ${item.desc}`;
                this.bot.sendMessage(chatId, message);
            });
        }, 5000);  // Check every 5 seconds
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

    registerCommands() {
        this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
        this.bot.onText(/\/watch/, (msg) => this.startMonitoring(msg.chat.id));
        this.bot.onText(/\/stop/, (msg) => this.stopMonitoring(msg.chat.id));
    }

    handleStart(msg) {
        const chatId = msg.chat.id;
        if (!this.userConfigs[chatId]) {
            this.userConfigs[chatId] = { ...this.baseConfig };
        }
        const welcomeMessage = `Welcome to the Vinted Monitor Bot! Use commands to configure monitoring.`;
        this.bot.sendMessage(chatId, welcomeMessage);
    }
}

export { BotManager };
