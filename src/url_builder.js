import { IntelligentNameIDFinder, DataReader } from "./util/data_reader.js";
import { BrandIdFetcher } from "./util/brand_fetcher.js";

/**
 * Class responsible for building and managing URL parameters for Vinted URL queries.
 */
class UrlBuilder {
    /**
     * Initializes a new instance of the UrlBuilder with a base URL.
     * @param {string} base - The base URL to which parameters will be appended.
     */
    constructor(base) {
        this.base = base;
        this.setup();
    }

    /**
     * Sets up the initial configuration for URL parameter management, including loading data for brands, catalogs, and sizes.
     */
    setup() {
        this.params = new URLSearchParams();
        this.brands_data = new DataReader('brand');
        this.brands_finder = new IntelligentNameIDFinder(this.brands_data.getData());
        this.catalog_data = new DataReader('groups');
        this.catalog_finder = null;
        this.size_data = new DataReader('sizes');
        this.size_finder = null;
    }

    /**
     * Appends or updates the 'search_text' parameter for the URL.
     * @param {string} text - Text to append to the search query.
     */
    setSearchText(text) {
        this.params.set('search_text', this.params.get('search_text') ? `${this.params.get('search_text')} ${text}` : text);
        return this;
    }

    /**
     * Sets the order parameter for item sorting in the URL.
     * @param {string} order - Order specification (e.g., 'newest_first').
     */
    setOrder(order) {
        this.params.set('order', order);
        return this;
    }

    /**
     * Asynchronously sets brand parameters by resolving brand IDs.
     * @param {Array<string>} brands_list - List of brand names.
     * @param {boolean} fetch_on_fail - Whether to fetch brand ID from a remote service if not found locally.
     * @param {WebDriver} driver - Selenium WebDriver instance for fetching brand IDs if necessary.
     */
    async setBrands(brands_list, fetch_on_fail = false, driver = null) {
        const brand_ids = await Promise.all(brands_list.map(async brand => {
            const brand_id = this.brands_finder.getBestMatch(brand).id;
            if (!brand_id && fetch_on_fail) {
                if (!driver) throw new Error('Driver must be provided to fetch brands');
                const brand_fetcher = new BrandIdFetcher(driver, true);
                return await brand_fetcher.getBrandId(brand);
            }
            return brand_id;
        }));
        this.params.set('brand_ids', brand_ids.join(','));
        return this;
    }

    /**
     * Sets size parameters for the URL, requiring the 'catalog_ids' to be set first.
     * @param {Array<string>} sizes_list - List of size labels.
     */
    setSizes(sizes_list) {
        if (!this.params.has('catalog_ids')) throw new Error('Catalog must be set before setting sizes');
        if (!this.size_finder) {
            this.setSearchText(sizes_list.join(' '))
            return this;
        }
        const size_ids = sizes_list.map(size => this.size_finder.getBestMatch(size).id);
        this.params.set('size_ids', size_ids.join(','));
        return this;
    }

    /**
     * Sets type of item to search for, loading the appropriate catalog data.
     * eg. 'Hommes', 'Femmes', 'Enfants', 'Maison', 'Loisirs', 'Autres'
     * @param {string} type - Type of item to search for (e.g.,
     */
    setType(type) {
        this.type = type;
        this.catalog_data = this.catalog_data.getSubData(type).children;
        return this;
    }

    /**
     * Sets catalog parameters for the URL.
     * @param {string} catalog - Catalog name.
     */
    setCatalog(catalog) {
        if (!this.type) throw new Error('Type must be set before setting catalog');
        if (!this.catalog_finder) this.catalog_finder = new IntelligentNameIDFinder(this.catalog_data);
        const catalog_ent = this.catalog_finder.getBestMatch(catalog);
        if (!catalog_ent) return this.setSearchText(catalog);
        this.params.set('catalog', catalog_ent.id);
        this.params.set('catalog_ids', catalog_ent.id);
        if (catalog_ent.size_id) this.size_finder = new IntelligentNameIDFinder(this.size_data.getSubData(catalog_ent.size_id.toString()));
        return this;
    }

    /**
     * Sets the minimum price parameter for the URL.
     * @param {number} price - Minimum price value.
     */
    setPriceFrom(price) {
        this.params.set('price_from', price);
        return this;
    }

    /**
     * Sets the maximum price parameter for the URL.
     * @param {number} price - Maximum price value.
     */
    setPriceTo(price) {
        this.params.set('price_to', price);
        return this;
    }

    /**
     * Builds the full URL with all configured parameters.
     * @returns {string} The complete URL ready for use.
     */
    build() {
        console.log(`URL Parameters: ${this.params.toString()}`);
        return `${this.base}?${this.params.toString()}`;
    }
}

export { UrlBuilder };
