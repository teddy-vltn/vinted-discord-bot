import { URL } from 'url';
import Logger from '../utils/logger.js';
import { isSubcategory } from '../database.js';

function parseVintedSearchParams(url) {
    try {
        const searchParams = {};
        const params = new URL(url).searchParams;
        const paramsKeys = ['search_text', 'order', 'catalog[]', 'brand_ids[]', 'size_ids[]', 'price_from', 'price_to', 'status_ids[]', 'material_ids[]', 'color_ids[]'];
        for (const key of paramsKeys) {
            //searchParams[key.replace('[]', '')] = params.getAll(key) || ["N/A"];
            const isMultiple = key.endsWith('[]');

            if (isMultiple) {
                searchParams[key.replace('[]', '')] = params.getAll(key) || null
            } else {
                searchParams[key] = params.get(key) || null;
            }
        }
        return searchParams;
    } catch (error) {
        Logger.error("Invalid URL provided: ", error.message);
        return null;
    }
}

/**
 * Checks if a Vinted item matches the given search parameters and country codes.
 *
 * @param {Object} item - The Vinted item to check.
 * @param {Object} searchParams - The search parameters to match against the item.
 * @param {Array} [countries_codes=[]] - The country codes to check against the item's user country code.
 * @return {boolean} Returns true if the item matches all the search parameters and country codes, false otherwise.
 */
function matchVintedItemToSearchParams(item, searchParams, countries_codes = []) {
    // Check country codes
    if (countries_codes.length && !countries_codes.includes(item.user.countryCode)) {
        return false;
    }

    // Check search text
    const lowerCaseItem = {
        title: item.title.toLowerCase(),
        description: item.description.toLowerCase(),
    };
    if (searchParams.search_text && !lowerCaseItem.title.includes(searchParams.search_text.toLowerCase()) && !lowerCaseItem.description.includes(searchParams.search_text.toLowerCase())) {
        return false;
    }

    // Check catalog IDs
    if (searchParams.catalog.length && !searchParams.catalog.some(catalogId => isSubcategory(catalogId, item.catalogId))) {
        return false;
    }

    // Check other parameters
    const searchParamsMap = new Map([
        ['brand_ids', 'brand'],
        ['size_ids', 'size'],
        ['price_from', 'price'],
        ['price_to', 'price'],
        ['status_ids', 'status'],
        ['material_ids', 'material'],
        ['color_ids', 'color'],
        ['catalog', 'catalogId'],
    ].map(([key, value]) => [key, item[value]]));

    console.log("Item: ", item.title, " searchParamsMap: ", searchParamsMap);

    for (const [key, value] of searchParamsMap) {
        if (searchParams[key] !== undefined && searchParams[key] !== null) {
            if (Array.isArray(searchParams[key])) {
                if (searchParams[key].length > 0 && !searchParams[key].includes(value)) {
                    return false;
                }
            } else {
                if (searchParams[key] !== value) {
                    return false;
                }
            }
        }
    }

    console.log("Item matched search parameters: ", item.title);

    // If all criteria are met, return true
    return true;
}

export function filterItemsByUrl(items, url, countries_codes = []) {
    const searchParams = parseVintedSearchParams(url);
    if (!searchParams) return [];

    return items.filter(item => matchVintedItemToSearchParams(item, searchParams, countries_codes));
}
