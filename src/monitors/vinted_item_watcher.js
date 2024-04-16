import { VintedHandlerSelenium, VintedHandlerAPI } from '../handlers/vinted_handler.js';
import { UrlBuilder } from '../utils/url_builder.js';
import { SeleniumChromeAgent } from '../agents/selenium_agent.js';

/**
 * A class designed to watch for new items on Vinted and trigger actions based on new findings.
 */
class VintedItemWatcher {
    /**
     * Constructs an instance of the VintedItemWatcher.
     * @param {string} url - The URL to monitor for new items.
     * @param {VintedHandlerSelenium | VintedHandlerAPI} vintedHandler - Handler for fetching items.
     * @param {Function} callback - Callback function to handle new items.
     * @param {number} [checkInterval=5000] - Time interval in milliseconds between checks for new items.
     */
    constructor(url, vintedHandler, callback, checkInterval = 5000) {
        this.url = url;
        this.vintedHandler = vintedHandler;
        this.callback = callback;
        this.checkInterval = checkInterval;
        this.lastItems = new Map();
        this.intervalId = null;
    }

    /**
     * Starts the monitoring process at specified intervals.
     */
    startWatching() {
        this.intervalId = setInterval(() => this.fetch(), this.checkInterval);
        console.log("Started watching for new items...");

        // Fetch items immediately on start to populate lastItems
        this.fetch();
    }

    /**
     * Stops the monitoring process.
     */
    stopWatching() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("Stopped watching.");
        }
    }

    /**
     * Fetches items from Vinted and checks for new entries.
     */
    async fetch() {
        const url = this.url;
        console.log(`Checking for new items at ${url}...`);
        try {
            const items = await this.vintedHandler.getItemsFromUrl(url);
            const newItems = this.compareNewItems(items);
            if (newItems.length > 0 && this.callback) {
                this.callback(newItems);  // Trigger the callback with new items
            }
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    }

    /**
     * Compares newly fetched items with previously stored items to determine if there are any new entries.
     * @param {Array} items - The latest list of items fetched from Vinted.
     * @returns {Array} - A list of new items that were not previously observed.
     */
    compareNewItems(items) {
        const newItems = [];
        const currentItemIds = new Set(items.map(item => item.url));  // Assumes each item has a unique URL

        items.forEach(item => {
            if (!this.lastItems.has(item.url)) {
                newItems.push(item);
                this.lastItems.set(item.url, item);
            }
        });

        // Remove items that no longer appear in the latest fetch
        this.lastItems.forEach((value, key) => {
            if (!currentItemIds.has(key)) {
                this.lastItems.delete(key);
            }
        });

        return newItems;
    }
}

export { VintedItemWatcher };
