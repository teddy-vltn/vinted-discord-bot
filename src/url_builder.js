import { IntelligentNameIDFinder, DataReader } from "./util/data_reader.js";
import { BrandIdFetcher } from "./util/brand_fetcher.js";

class UrlBuilder {
    constructor(base) {
        this.base = base;
        this.setup();
    }

    setup() {
        this.params = new URLSearchParams();

        this.brands_data = new DataReader('brand');
        this.brands_finder = new IntelligentNameIDFinder(this.brands_data.getData());

        this.catalog_data = new DataReader('groups');
        this.catalog_finder = new IntelligentNameIDFinder(this.catalog_data.getData());

        this.size_data = new DataReader('sizes');
        this.size_finder = null
    }

    setSearchText(text) {
        // check if search_text is already set
        if (this.params.has('search_text')) {
            const current_text = this.params.get('search_text');
            text = `${current_text} ${text}`;
        }
        this.params.set('search_text', text);
        return this;
    }

    setOrder(order) {
        this.params.set('order', order);
        return this;
    }

    async setBrands(brands_list, fetch_on_fail = false, driver = null) {
        // Resolve all promises at once using Promise.all
        const brand_ids = await Promise.all(brands_list.map(async brand => {
            const brand_id = this.brands_finder.getBestMatch(brand).id;
            if (!brand_id) {
                if (fetch_on_fail) {
                    if (!driver) {
                        throw new Error('Driver must be provided to fetch brands');
                    }
                    const brand_fetcher = new BrandIdFetcher(driver, true);
                    const new_brand_id = await brand_fetcher.getBrandId(brand);
                    if (!new_brand_id) {
                        throw new Error(`Brand ${brand} not found`);
                    }
                    return new_brand_id;
                }
                throw new Error(`Brand ${brand} not found in brand data`);
            }
            return brand_id;
        }));
    
        // Now brand_ids is an array of resolved values
        this.params.set('brand_ids', brand_ids.join(','));
    
        return this;
    }    

    setSizes(sizes_list) {
        // We check if catalog is set
        if (!this.params.has('catalog_ids')) {
            this.setSearchText(sizes_list.join(' '));
            return this;
        }
        
        const size_ids = sizes_list.map(size => {
            const size_id = this.size_finder.getBestMatch(size).id;
            if (!size_id) {
                throw new Error(`Size ${size} not found in size data`);
            }
            return size_id;
        });
        
        this.params.set('size_ids', size_ids.join(','));
        return this;
    }

    setCatalog(catalog) {
        const catalog_ent = this.catalog_finder.getBestMatch(catalog);
        let catalog_id = null;
        
        // create the finder for the sizes if catalog.size_id is set
        if (catalog_ent) {
            catalog_id = catalog_ent.id;

            const string_size_id = catalog_ent.size_id.toString();
            const data = this.size_data.getSubData(string_size_id);

            this.size_finder = new IntelligentNameIDFinder(data);

            this.params.set('catalog_ids', catalog_id);
            this.params.set('catalog', catalog_id);
        }

        if (!catalog_id) {
            console.log("Not found in catalog data, we add to search text")
            this.setSearchText(catalog);
        }

        return this;
    }

    setPriceFrom(price) {
        this.params.set('price_from', price);
        return this;
    }

    setPriceTo(price) {
        this.params.set('price_to', price);
        return this;
    }

    // Add other methods for different URL parameters as needed
    // Example:
    // setSize(size) {
    //     this.params.set('size', size);
    //     return this;
    // }

    build() {
        console.log(this.params.toString());
        return `${this.base}?${this.params.toString()}`;
    }
}

export { UrlBuilder };