import { VintedHandler } from './vinted.js';
import { UrlBuilder } from './url_builder.js';
import { SeleniumChromeAgent } from './selenium_agent.js';
import { VintedItemWatcher } from './vinted_item_watcher.js';

class VintedMonitor {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async setup() {
        this.agent = new SeleniumChromeAgent();
        this.driver = await this.agent.getDriver();
        this.handler = new VintedHandler(this.driver);
        this.urlBuilder = new UrlBuilder(this.baseURL);
    }

    async configure(options) {
        await this.setup();

        const order = options.order || 'newest_first';
        const catalog = options.catalog || 'Tailles hommes';
        const brands = options.brands || [];
        const sizes = options.sizes || [];
        const priceFrom = options.priceFrom || 0;
        const priceTo = options.priceTo || 1000;
        
        console.log("Configuring monitor with options:", options);
        this.urlBuilder.setOrder(order);
        this.urlBuilder.setCatalog(catalog);
        await this.urlBuilder.setBrands(brands);
        this.urlBuilder.setSizes(sizes);
        this.urlBuilder.setPriceFrom(priceFrom);
        this.urlBuilder.setPriceTo(priceTo);

        this.urlBuilder.build();
    }

    startMonitoring(callback, interval = 60000) {
        this.watcher = new VintedItemWatcher(this.urlBuilder, this.handler, callback, interval);
        this.watcher.startWatching();
    }

    stopMonitoring() {
        if (this.watcher) {
            this.watcher.stopWatching();
        }
    }
}

export { VintedMonitor };