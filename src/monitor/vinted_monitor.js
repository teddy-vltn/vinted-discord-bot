const VINTED_API_URL = "https://www.{domain}/api/v2/catalog"

import { UrlTransformer } from "../utils/url_transformer.js";
import Logger from "../utils/logger.js";

class VintedMonitor {
    constructor(handler, proxy_handler = null) {
        this.handler = new handler(proxy_handler=proxy_handler);
        this.interval = null;
        this.lastItemIds = new Set(); // Cache to store the IDs of previously fetched items
        this.firstRun = true;
    }

    startMonitoring(url, callback, interval) {
        const apiUrl = UrlTransformer.transform(url);
        if (!apiUrl) {
            Logger.error("Invalid URL");
            return;
        }

        Logger.info(`Monitoring URL: ${url}`);
        this.interval = setInterval(async () => {
            try {
                const items = await this.handler.fetchItems(apiUrl);
                const newItems = items.filter(item => !this.lastItemIds.has(item.id));
                // sort by highest id last to get the newest items first
                Logger.debug(`New items found: ${newItems.length}`);
                newItems.sort((a, b) => a.id - b.id);
                if (newItems.length > 0) {
                    newItems.forEach(item => this.lastItemIds.add(item.id)); // Update cache
                    if (this.firstRun) {
                        this.firstRun = false;
                        Logger.info(`First run, skipping ${newItems.length} items`);
                        Logger.info(`This is the first run, skipping ${newItems.length} items`);
                    } else {
                        callback(newItems);
                    }
                }
            } catch (error) {
                Logger.warn(`Error fetching items: ${error.message}, ${error.stack}`);
            }
        }, interval);
    }

    stopMonitoring() {
        if (this.interval) clearInterval(this.interval);
    }
}

export default VintedMonitor;
