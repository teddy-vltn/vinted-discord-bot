const VINTED_API_URL = "https://www.{domain}/api/v2/catalog"

import Logger from "../utils/logger.js";

class VintedMonitor {
    constructor(handler, proxy_handler = null) {
        this.handler = new handler(proxy_handler=proxy_handler);
        this.interval = null;
        this.lastItemIds = new Set(); // Cache to store the IDs of previously fetched items
        this.firstRun = true;
    }

    transformUrl(url) {

        // get domain counrty code from the URL
        // get the domain after the second dot and before the next /
        // e.g. https://www.vinted.co.uk/catalog?catalog%5B%5D=2050&brand_ids%5B%5D=53&brand_ids%5B%5D=7
        // should return co.uk
        const domain = url.substring(url.indexOf('.') + 1, url.indexOf('/', url.indexOf('.') + 1));
        const vintedUrl = VINTED_API_URL.replace("{domain}", domain);

        const order = "order=newest_first";
        const per_page = "per_page=15";

        // catalog parameter becomes catalog_ids
        // remove all %5B%5D from the URL

        url = url.replace(/%5B%5D/g, "");

        // Extract the parameters from the URL and return a new API URL
        if (url.includes("catalog?")) {
            let params = url.substring(url.indexOf('?'));
            // replace catalog[] with catalog_ids
            params = params.replace("catalog", "catalog_ids");
            return vintedUrl + "/items" + params + "&" + order + "&" + per_page;
        }

        if (url.includes("catalog/")) {
            let catalog_slug = url.substring(url.lastIndexOf('/') + 1);
            let catalogId = catalog_slug.split('-')[0];
            return `${vintedUrl}/items?catalog_ids=${catalogId}` + "&" + order + "&" + per_page;
        }
    }

    startMonitoring(url, callback, interval) {
        const apiUrl = this.transformUrl(url);
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
                        Logger.info(`This is to avoid sending notifications for items that were already present when the monitoring started.`)
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
