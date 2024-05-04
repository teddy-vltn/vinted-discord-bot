import { UrlTransformer } from "../utils/url_transformer.js";
import Logger from "../utils/logger.js";

export default class VintedMonitor {
    constructor(handler, proxyHandler = null) {
        this.handler = new handler(proxyHandler);
        this.interval = null;
        this.firstRun = true;
    }

    startMonitoring(url, processItems, interval) {
        const apiUrl = UrlTransformer.transform(url);
        if (!apiUrl) {
            Logger.error("Invalid URL");
            return;
        }

        Logger.info(`Monitoring URL: ${url}`);
        this.interval = setInterval(async () => {
            try {
                const items = await this.handler.fetchItems(apiUrl);
                processItems(items, this.firstRun);
                this.firstRun = false; // Set firstRun to false after the first check
            } catch (error) {
                Logger.warn(`Error fetching items: ${error.message}, ${error.stack}`);
            }
        }, interval);
    }

    stopMonitoring() {
        if (this.interval) clearInterval(this.interval);
    }
}
