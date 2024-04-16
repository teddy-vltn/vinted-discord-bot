import { VintedMonitor } from './src/vinted_monitor.js';
import { ProxyEntity } from './src/proxys.js';

/**
 * This script initializes a VintedMonitor to track new listings on Vinted.
 * It supports both Selenium-based scraping and Vinted's API usage.
 */

async function main() {
    // Initialize VintedMonitor with the specific Vinted domain you want to track.
    const vintedMonitor = new VintedMonitor('https://www.vinted.fr');

    // Optionally, enable Selenium scraping; set to false to use Vinted's API.
    vintedMonitor.useSelenium(true);

    // Configure a proxy if running from a location with IP restrictions.
    // WARNING: Use reliable proxies to avoid security risks and ensure data integrity.
    // vintedMonitor.useProxy(new ProxyEntity("128.199.221.91", "61449", "http"));

    // Set up monitoring configuration.
    await vintedMonitor.configure({
        search_text: 'veste',
        order: 'newest_first',  // Ensures that the monitor fetches the newest items available.
        brands: ['Nike', 'Adidas'],  // Specify brands to monitor.
        catalog: "Veste hommes",  // Specify the catalog name; the system will find the closest match.
        sizes: ['XS', 'S'],  // Specify sizes to monitor.
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

     }, 5000);  // Monitoring interval set to every 5 seconds.

    // Optionally, stop monitoring after a specified time.
    setTimeout(() => {
        vintedMonitor.stopMonitoring();
        console.log("Monitoring has been stopped.");
    }, 3600000); // Stops after 1 hour.
}

main();
