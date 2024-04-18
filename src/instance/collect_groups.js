import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Function to recursively simplify the catalog tree
function simplifyCatalog(catalog) {
    let simplifiedCatalog = {};
    let key = catalog.title; // Assuming 'title' is the correct field for the name of the catalog
    simplifiedCatalog[key] = {
        id: catalog.id,
        slug: catalog.code.toLowerCase().replace(/\s+/g, '-'), // Assuming 'code' field exists and can be used as slug
        size_id: catalog.size_group_id, // Assuming this is the correct field for size_id
        children: {}
    };

    // Recursively simplify all children catalogs
    if (catalog.catalogs && catalog.catalogs.length > 0) {
        for (let child of catalog.catalogs) {
            Object.assign(simplifiedCatalog[key].children, simplifyCatalog(child));
        }
    }

    return simplifiedCatalog;
}

async function fetchCatalogData(countryCode) {
    const url = `https://www.vinted.${countryCode}/catalog/1904`;
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const script = $('#__NEXT_DATA__').html();
    return JSON.parse(script);
}

async function processCountryCode(countryCode) {
    try {
        const catalogData = await fetchCatalogData(countryCode);
        let simplifiedCatalogs = {};
        for (let catalog of catalogData.props.pageProps._layout.catalogTree) {
            Object.assign(simplifiedCatalogs, simplifyCatalog(catalog));
        }
        const countryDirectory = path.join('./data', countryCode);
        if (!fs.existsSync(countryDirectory)) {
            fs.mkdirSync(countryDirectory, { recursive: true });
        }
        const outputFile = path.join(countryDirectory, 'groups.json');
        fs.writeFileSync(outputFile, JSON.stringify(simplifiedCatalogs, null, 2), 'utf8');
        console.log(`Simplified file for ${countryCode} has been written.`);
    } catch (error) {
        console.error(`An error occurred for ${countryCode}:`, error);
    }
}

async function main() {
    const countryCodes = ['es', 'it', 'fr', 'de', 'nl', 'be', 'lu', 'pt', 'co.uk', 'com']
    for (let countryCode of countryCodes) {
        await processCountryCode(countryCode);
    }
}

main();
