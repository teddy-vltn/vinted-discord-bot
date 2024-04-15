import { VintedMonitor } from './src/vinted_monitor.js';
import { ProxyEntity } from './src/proxys.js';

// Usage example
async function main() {
    const vintedMonitor = new VintedMonitor(
        'https://www.vinted.fr/catalog',
        // constructor(ip, port, username, password)
        new ProxyEntity( "38.162.17.52", "3128", null, null)
    );

    await vintedMonitor.configure({
        order: 'newest_first',
        brands: ['Nike', 'Puma'],
        priceFrom: 10,
        priceTo: 100
    });

    vintedMonitor.startMonitoring(newItems => {
        console.log(`Found ${newItems.length} new items:`);
        newItems.forEach(item => console.log(item.toString()));
    }, 5000);  // Check every 5 seconds

    // Optionally, stop the watcher after some time
    setTimeout(() => {
        vintedMonitor.stopMonitoring();
    }, 3600000); // Stops after 1 hour
}

main();

