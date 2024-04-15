import { VintedHandlerSelenium, VintedHandlerAPI } from './vinted.js';
import { UrlBuilder } from './url_builder.js';
import { SeleniumChromeAgent } from './selenium_agent.js';
import { VintedItemWatcher } from './vinted_item_watcher.js';

class VintedMonitor {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    useSelenium(useSelenium) {
        this.selenium = useSelenium;
    }

    useProxy(proxy) {
        this.proxy = proxy;
    }

    async setup() {
        
        if (this.selenium) {
            this.agent = new SeleniumChromeAgent(this.proxy);
            this.driver = await this.agent.getDriver();
            this.handler = new VintedHandlerSelenium(this.driver);
            this.baseURL = this.baseURL + '/catalog';
        } else {
            this.handler = new VintedHandlerAPI();
            if (this.proxy) {
                this.handler.useProxy(this.proxy);
            }
            this.baseURL = this.baseURL + '/api/v2/catalog/items';
        }

        this.urlBuilder = new UrlBuilder(this.baseURL);
    }

    async configure(options) {
        await this.setup();

        const order = options.order || 'newest_first';
        const catalog = options.catalog || null
        const brands = options.brands || [];
        const sizes = options.sizes || [];
        const priceFrom = options.priceFrom || 0;
        const priceTo = options.priceTo || 1000;
        
        console.log("Configuring monitor with options:", options);
        this.urlBuilder.setOrder(order);

        if (catalog) {
            this.urlBuilder.setCatalog(catalog);
        }

        if (brands.length > 0) {
            await this.urlBuilder.setBrands(brands);
        }

        if (sizes.length > 0) {
            this.urlBuilder.setSizes(sizes);
        }

        if (priceFrom) {
            this.urlBuilder.setPriceFrom(priceFrom);
        }

        if (priceTo) {
            this.urlBuilder.setPriceTo(priceTo);
        }
    }

    startMonitoring(callback, interval = 60000) {
        this.watcher = new VintedItemWatcher(this.urlBuilder.build(), this.handler, callback, interval);
        this.watcher.startWatching();
    }

    stopMonitoring() {
        if (this.watcher) {
            this.watcher.stopWatching();
        }
    }
}

export { VintedMonitor };