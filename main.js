import { VintedMonitor } from './src/monitors/vinted_monitor.js';
import { BotManager} from './src/bot/telegram.js';  // Assuming BotManager is in this path
import { ProxyHandler } from './src/utils/proxys.js';
import { config } from 'dotenv';

// Load environment variables
config();
config({ path: `.env.local`, override: true });

const env = process.env;

async function main() {
    if (process.argv.includes("--bot")) {
        // Start as Telegram Bot
        const botManager = new BotManager();
        console.log("Bot is running...");
    } else {
        // Start as Vinted Monitor
        const vintedMonitor = new VintedMonitor();
        vintedMonitor.setCountryCode(env.COUNTRY_CODE);
        vintedMonitor.useSelenium(env.USE_SELENIUM === 'true');

        if (env.PROXY_ENABLED === 'true') {
            vintedMonitor.useProxy(new ProxyHandler(
                env.PROXY_PROTOCOL,
                env.PROXY_IP,
                env.PROXY_PORT,
                env.PROXY_USERNAME,
                env.PROXY_PASSWORD
            ));
        }

        await vintedMonitor.configure({
            search_text: env.SEARCH_TEXT,
            brands: env.BRANDS.split(',').map(brand => brand.trim()),
            priceFrom: parseInt(env.PRICE_FROM, 10),
            priceTo: parseInt(env.PRICE_TO, 10)
        });

        vintedMonitor.startMonitoring(newItems => {
            newItems.forEach(item => {
                console.log(`New item found: ${item}`);
            });
        }, 5000);

        setTimeout(() => {
            vintedMonitor.stopMonitoring();
            console.log("Monitoring has been stopped.");
        }, 3600000);  // Stops after 1 hour.
    }
}

main();
