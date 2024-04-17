import { VintedMonitor } from './src/monitors/vinted_monitor.js';
import { ProxyHandler } from './src/utils/proxys.js';
import { config } from 'dotenv';

// Dont touch this don't even think about it just let it be
// Load environment variables
config();
config({ path: `.env.local`, override: true });

// Get environment variables
const env = process.env;

/**
 * This script initializes a VintedMonitor to track new listings on Vinted.
 * It supports both Selenium-based scraping and Vinted's API usage.
 */

async function main() {
    // Initialize VintedMonitor with the specific Vinted domain you want to track.
    const vintedMonitor = new VintedMonitor('https://www.vinted.fr');

    // Optionally, enable Selenium scraping; set to false to use Vinted's API.
    // Vinted API is faster and more reliable, but Selenium scraping is more robust.
    // In default configuration, the monitor uses Vinted's API to avoid Selenium setup.
    vintedMonitor.useSelenium(true);

    // Configure a proxy if running from a location with IP restrictions.
    // WARNING: Use reliable proxies to avoid security risks and ensure data integrity.
    if (env.PROXY_ENABLED === 'true') {
        console.log("Using proxy configuration.");
        vintedMonitor.useProxy(new ProxyHandler(env.PROXY_PROTOCOL, env.PROXY_IP, env.PROXY_PORT, env.PROXY_USERNAME, env.PROXY_PASSWORD));
    }

    // Set up monitoring configuration.
    await vintedMonitor.configure({
        search_text: 'veste',
        order: 'newest_first',  // Ensures that the monitor fetches the newest items available.
        brands: ['Nike', 'Adidas'],  // Specify brands to monitor.
        // Specify the type of item to monitor, "Hommes", "Femmes", "Enfants", "Bébés", "Autres".
        // WARNING : Those are strict values, make sure to use one of the above.
        type: "Hommes", 
        catalog: "Vestes et manteaux",  // Specify the catalog name; the system will find the closest match.
        sizes: ['XS', 'S', 'M', 'L'],  // Specify sizes to monitor.
        priceFrom: 10,  // Set minimum price filter.
        priceTo: 100  // Set maximum price filter.
    });

    // Start monitoring. The provided callback handles new item alerts.
    vintedMonitor.startMonitoring(newItems => {
        console.log(`Found ${newItems.length} new items:`);
        /*
            You can customize the output based on your needs.

            You can use:
            - item.brand
            - item.price
            - item.size
            - item.url
            - item.imageUrl
            - item.owner
            - item.ownerId
            - item.desc
        */

        // Example using everything available.
        newItems.forEach(item => {
            const message = `New item found:\nBrand: ${item.brand}\nPrice: ${item.price}\nSize: ${item.size}\nURL: ${item.url}\nImage: ${item.imageUrl}\nOwner: ${item.owner}\nOwner ID: ${item.ownerId}\nDescription: ${item.desc}`;
            const separator = '-'.repeat(30);
            console.log(message);
            console.log(separator);
        });

        /*
            If you need more information about the item, you can use the getMoreInfo method.
            This require Selenium to be enabled for now. I will adapt it for API usage soon.

            It will give you the following information:
            - item.desc
            - item.rating
            - item.votes

            newItems[0].getMoreInfo(vintedMonitor.driver).then(info => {
                console.log(info);
            });
        */

     }, 5000);  // Monitoring interval set to every 5 seconds.

    // Optionally, stop monitoring after a specified time.
    setTimeout(() => {
        vintedMonitor.stopMonitoring();
        console.log("Monitoring has been stopped.");
    }, 3600000); // Stops after 1 hour.
}

main();
