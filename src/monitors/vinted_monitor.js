import { VintedHandlerSelenium, VintedHandlerAPI } from '../handlers/vinted_handler.js';
import { UrlBuilder } from '../utils/url_builder.js';
import { SeleniumChromeAgent } from '../agents/selenium_agent.js';
import { VintedItemWatcher } from './vinted_item_watcher.js';

const VINTED_BASE_URL_WITHOUT_COUNTRY = 'https://www.vinted.';

/**
 * Class that facilitates monitoring of Vinted for new listings based on configured criteria.
 */
class VintedMonitor {
    /**
     * Initializes the VintedMonitor with a specified base URL.
     * @param {string} baseURL - The base URL to use for Vinted API or website.
     */
    constructor() {

        this.baseURL = null;
        this.selenium = false;
        this.proxy = null;

    }

    /** 
     * Sets the country code for the Vinted website.
     * @param {string} countryCode - The country code to use for the Vinted website.
     */
    setCountryCode(countryCode) {
        this.baseURL = VINTED_BASE_URL_WITHOUT_COUNTRY + countryCode;
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

        if (!this.baseURL) {
            throw new Error('Please use setCountryCode() to set the country code before configuring the monitor, e.g., setCountryCode("fr") for France Vinted or setCountryCode("co.uk") for UK Vinted');
        }

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

        if (!options) {
            throw new Error(`Please provide configuration options to the configure() method.\n\nExample: configure({ order: 'newest_first', search_text: 'Pull' brands: ['Nike', 'Adidas'], priceFrom: 10, priceTo: 100 })\n`);
        }

        console.log("Configuring monitor with options:", options);
        this.urlBuilder.setOrder('newest_first');

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

        if (!this.urlBuilder) {
            throw new Error('Please configure the monitor before starting monitoring. Use configure() method to set up the monitor.');
        }

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
