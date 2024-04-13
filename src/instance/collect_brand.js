import { VintedHandler } from '../vinted.js';
import { UrlBuilder } from '../url_builder.js';
import { SeleniumChromeAgent } from '../selenium_agent.js';
import { BrandIdFetcher } from '../util/brand_fetcher.js';
import fs from 'fs';

// Make sure the brand file exists or create it if it doesn't
const brandFilePath = './data/brand.json';
if (!fs.existsSync(brandFilePath)) {
    fs.writeFileSync(brandFilePath, '[]'); // Initialize with an empty array
}

// Helper function to read brands from file
function readBrandsFromFile() {
    const data = fs.readFileSync(brandFilePath, 'utf8');
    return JSON.parse(data);
}

let knownBrands = readBrandsFromFile();

function findBrandByName(name) {
    return knownBrands[name] || null;
}

// Helper function to write a new brand to file
function addBrandToFile(brand) {
    knownBrands = { ...knownBrands, ...brand };
    fs.writeFileSync(brandFilePath, JSON.stringify(knownBrands, null, 2)); // Pretty print JSON
}

async function fetchAndProcessItems() {
    const agent = new SeleniumChromeAgent();
    const driver = await agent.getDriver();
    const vintedHandler = new VintedHandler(driver);
    const brandFetcher = new BrandIdFetcher(driver); // Assuming BrandIdFetcher uses the same driver

    const urlBuilder = new UrlBuilder('https://www.vinted.fr/catalog');
    const url = urlBuilder
            .setOrder('newest_first')
            .setCatalog("Tailles hommes")
            .setSizes(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
            .setPriceFrom(10)
            .build();

    console.log(`Fetching items from ${url}...`)

    while (true) {
        const items = await vintedHandler.getItemsFromUrl(url);

        for (let item of items) {
            if (item.brand) {
                const existingBrand = findBrandByName(item.brand);
                if (existingBrand) {
                    console.log(`Brand ID for ${item.brand} already known: ${existingBrand.id}`);
                } else {
                    const brandId = await brandFetcher.getBrandId(item.brand);
                    if (brandId === null) {
                        console.log(`Brand ID not found for ${item.brand}`);
                    } else {
                        console.log(`New Brand ID for ${item.brand}: ${brandId}`);
                        /*
                        Add the brand to the known brands list
                        Like this:
                        addBrandToFile({
                            "brand_name": brand_id
                        });
                        */

                        addBrandToFile({
                            [item.brand]: brandId
                        });

                        await new Promise(resolve => setTimeout(resolve, 1000));

                    }
                }
            }
           
        }

        console.log("Waiting 30 seconds before repeating...");
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
   
}

fetchAndProcessItems().catch(error => {
    console.error("An error occurred in the main loop:", error);
});
