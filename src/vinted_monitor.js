import { VintedHandlerSelenium, VintedHandlerAPI } from './vinted.js';
import { UrlBuilder } from './url_builder.js';
import { SeleniumChromeAgent } from './selenium_agent.js';
import { VintedItemWatcher } from './vinted_item_watcher.js';

/**
 * Class that facilitates monitoring of Vinted for new listings based on configured criteria.
 */
class VintedMonitor {
    /**
     * Initializes the VintedMonitor with a specified base URL.
     * @param {string} baseURL - The base URL to use for Vinted API or website.
     */
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    /**
     * Configures the monitor to use Selenium for scraping or direct API calls.
     * @param {boolean} useSelenium - Whether to use Selenium for scraping.
     */
    useSelenium(useSelenium) {
        this.selenium = useSelenium;
    }

    /**
     * Sets a proxy for network requests.
     * @param {ProxyEntity} proxy - The proxy configuration to use.
     */
    useProxy(proxy) {
        this.proxy = proxy;
    }

    /**
     * Sets up the handler based on the configuration of using Selenium or direct API.
     */
    async setup() {
        if (this.selenium) {
            this.agent = new SeleniumChromeAgent(this.proxy);
            this.driver = await this.agent.getDriver();
            this.handler = new VintedHandlerSelenium(this.driver);
            this.baseURL += '/catalog';
        } else {
            this.handler = new VintedHandlerAPI();
            if (this.proxy) {
                this.handler.useProxy(this.proxy);
            }
            this.baseURL += '/api/v2/catalog/items';
        }

        this.urlBuilder = new UrlBuilder(this.baseURL);
    }

    /**
     * Configures the monitor with search parameters.
     * @param {object} options - Configuration options including brands, sizes, catalog, and price range.
     */
    async configure(options) {
        await this.setup();

        console.log("Configuring monitor with options:", options);
        this.urlBuilder.setOrder(options.order || 'newest_first');

        if (options.search_text) {
            this.urlBuilder.setSearchText(options.search_text);
        }
        if (options.type) {
            this.urlBuilder.setType(options.type)
        }
        if (options.catalog) {
            this.urlBuilder.setCatalog(options.catalog);
        }
        if (options.brands && options.brands.length > 0) {
            await this.urlBuilder.setBrands(options.brands);
        }
        if (options.sizes && options.sizes.length > 0) {
            this.urlBuilder.setSizes(options.sizes);
        }
        if (options.priceFrom) {
            this.urlBuilder.setPriceFrom(options.priceFrom);
        }
        if (options.priceTo) {
            this.urlBuilder.setPriceTo(options.priceTo);
        }
    }

    /**
     * Starts monitoring Vinted for new listings based on the configured options.
     * @param {Function} callback - Callback to handle new items.
     * @param {number} interval - Interval in milliseconds to check for new items.
     */
    startMonitoring(callback, interval = 60000) {
        const builtUrl = this.urlBuilder.build();
        this.watcher = new VintedItemWatcher(builtUrl, this.handler, callback, interval);
        this.watcher.startWatching();
    }

    /**
     * Stops the active monitoring.
     */
    stopMonitoring() {
        if (this.watcher) {
            this.watcher.stopWatching();
        }
    }
}

export { VintedMonitor };
