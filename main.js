import { VintedMonitor } from './src/vinted_monitor.js';
import { ProxyEntity } from './src/proxys.js';

// Usage example
async function main() {
    const vintedMonitor = new VintedMonitor(
        'https://www.vinted.fr'
    );

    vintedMonitor.useSelenium(true)
    //vintedMonitor.useProxy(new ProxyEntity("128.199.221.91", "61449", "http"));

    await vintedMonitor.configure({
        order: 'newest_first', // dont change this value if you want to get the newest items
        brands: [], // Add brands here eg. ['Nike', 'Adidas']
        catalog: "Veste hommes", // Add catalog name here eg. "Jeans hommes" it will find the closet match
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
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

