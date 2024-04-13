import { VintedMonitor } from './src/vinted_monitor.js';

// Usage example
async function main() {
    const vintedMonitor = new VintedMonitor('https://www.vinted.fr/catalog');

    await vintedMonitor.configure({
        order: 'newest_first',
        catalog: 'Tailles hommes',
        brands: ['Nike', 'Puma'],
        sizes: ['XS'],
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

