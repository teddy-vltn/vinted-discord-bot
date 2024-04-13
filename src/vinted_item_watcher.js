import { VintedHandler } from './vinted.js';
import { UrlBuilder } from './url_builder.js';
import { SeleniumChromeAgent } from './selenium_agent.js';

class VintedItemWatcher {
    constructor(urlBuilder, vintedHandler, callback, checkInterval = 5000) {
        this.urlBuilder = urlBuilder;
        this.vintedHandler = vintedHandler;
        this.callback = callback;  // Callback to handle new items
        this.checkInterval = checkInterval;
        this.lastItems = new Map();  // Stores the last seen items for comparison
        this.intervalId = null;
    }

    startWatching() {
        this.intervalId = setInterval(() => this.fetch(), this.checkInterval);
        console.log("Started watching for new items...");

        // Fetch items immediately on start to make a cold start and populate lastItems
        this.fetch();

    }

    stopWatching() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("Stopped watching.");
        }
    }

    async fetch() {
        const url = this.urlBuilder.build();
        console.log(`Checking for new items at ${url}...`);
        try {
            const items = await this.vintedHandler.getItemsFromUrl(url);
            const newItems = this.compareNewItems(items);
            if (newItems.length > 0 && this.callback) {
                this.callback(newItems);  // Invoke the callback with new items
            }
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    }

    compareNewItems(items) {
        const newItems = [];
        const currentItemIds = new Set(items.map(item => item.url)); // Assuming each item has a unique URL

        items.forEach(item => {
            if (!this.lastItems.has(item.url)) {
                newItems.push(item);
                this.lastItems.set(item.url, item);
            }
        });

        // Clean up lastItems map to remove old items not present in the current fetch
        this.lastItems.forEach((value, key) => {
            if (!currentItemIds.has(key)) {
                this.lastItems.delete(key);
            }
        });

        return newItems;
    }
}

export { VintedItemWatcher };

/*
// Usage example setup:
const agent = new SeleniumChromeAgent();
const driver = await agent.getDriver();
const handler = new VintedHandler(driver);
const urlBuilder = new UrlBuilder('https://www.vinted.fr/catalog');
urlBuilder.setOrder('newest_first');
urlBuilder.setCatalog("Tailles hommes");
await urlBuilder.setBrands(['Nike']);
urlBuilder.setSizes(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

const watcher = new VintedItemWatcher(urlBuilder, handler, newItems => {
    console.log(`Found ${newItems.length} new items:`);
    console.log(newItems.map(item => item.toString()));
});
watcher.startWatching();

// Optionally, stop the watcher after some time
setTimeout(() => {
    watcher.stopWatching();
}, 3600000); // Stops after 1 hour
*/