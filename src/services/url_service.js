import { URL } from 'url';
import Logger from '../utils/logger.js';
import Fuse from 'fuse.js'; // Import Fuse.js

// Translation of Vinted channel URL parameters into catalog API parameters.
// The key is the parameter name in the URL, the value its name in the API.
const URL_TO_API_FILTER = {
    'catalog[]': 'catalog_ids',
    'brand_ids[]': 'brand_ids',
    'size_ids[]': 'size_ids',
    'status_ids[]': 'status_ids',
    'color_ids[]': 'color_ids',
    'material_ids[]': 'material_ids',
    'video_game_platform_ids[]': 'video_game_platform_ids',
    'search_text': 'search_text',
    'price_from': 'price_from',
    'price_to': 'price_to',
    'currency': 'currency',
};

function parseVintedSearchParams(url) {
    try {
        const searchParams = {};
        const params = new URL(url).searchParams;
        const paramsKeys = ['search_text', 'order', 'catalog[]', 'brand_ids[]', 'video_game_platform_ids[]', 'size_ids[]', 'price_from', 'price_to', 'currency', 'status_ids[]', 'material_ids[]', 'color_ids[]'];
        for (const key of paramsKeys) {
            const isMultiple = key.endsWith('[]');
            if (isMultiple) {
                searchParams[key.replace('[]', '')] = params.getAll(key) || null;
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
 * Translates a Vinted channel URL into filters for the catalog API.
 * Filtering is done by the server, because the trimmed catalog response no longer
 * carries catalog_id, brand_id or the other fields used for local filtering before.
 * @param {string} url - Vinted catalog URL saved for a channel.
 * @returns {Object|null} - Filters for fetchCatalogItems, or null for an invalid URL.
 */
export function buildApiFiltersFromUrl(url) {
    let params;
    try {
        params = new URL(url).searchParams;
    } catch (error) {
        Logger.error(`Invalid URL provided: ${error.message}`);
        return null;
    }

    const filters = {};

    for (const [urlKey, apiKey] of Object.entries(URL_TO_API_FILTER)) {
        if (urlKey.endsWith('[]')) {
            const values = params.getAll(urlKey);
            if (values.length) {
                filters[apiKey] = values;
            }
            continue;
        }

        const value = params.get(urlKey);
        if (value !== null && value !== '') {
            filters[apiKey] = value;
        }
    }

    return filters;
}

/**
 * Checks whether the URL narrows the search at all.
 * A channel without a single filter would watch all of Vinted, flooding both the channel and the API.
 * @param {Object|null} filters - Filters from buildApiFiltersFromUrl.
 * @returns {boolean} - True when at least one filter is present.
 */
export function hasAnyFilter(filters) {
    return Boolean(filters) && Object.keys(filters).length > 0;
}

/**
 * Checks if a Vinted item matches the given search parameters, using fuzzy search.
 *
 * Category, brand, size, condition and price are no longer checked locally - the server
 * handles them during the request. Today's Vinted sends the seller country neither in the
 * catalog nor on the item page, so the countries_codes parameter is kept for backward
 * compatibility of callers but no longer filters.
 *
 * @param {Object} item - The Vinted item to check.
 * @param {Object} searchParams - The search parameters to match against the item.
 * @param {Array} bannedKeywords - Keywords that must not appear in the item.
 * @return {boolean} Returns true if the item matches, false otherwise.
 */
function matchVintedItemToSearchParams(item, searchParams, bannedKeywords) {
    const lowerCaseItem = {
        title: (item.title || '').toLowerCase(),
        description: (item.description || '').toLowerCase(),
        brand: (item.brand || '').toLowerCase()
    };

    // make sure the bannedKeywords is an array of lowercase strings
    bannedKeywords = (bannedKeywords || []).map(keyword => keyword.toLowerCase());

    // check for banned keywords in the title and description
    if (bannedKeywords.some(keyword => lowerCaseItem.title.includes(keyword) || lowerCaseItem.description.includes(keyword))) {
        return false;
    }

    // Fuzzy search options
    const fuseOptions = {
        includeScore: true,
        threshold: 0.4,  // Adjust this value for fuzzy tolerance (lower is stricter, higher is more lenient)
        keys: ['title', 'description', 'brand']
    };

    // sanitize the search text
    if (searchParams.search_text && searchParams.search_text.length > 0 && searchParams.search_text !== " ") {
        const searchText = searchParams.search_text.toLowerCase();
        const fuse = new Fuse([lowerCaseItem], fuseOptions);
        const result = fuse.search(searchText);

        // If no result or score is too low, return false
        if (!result.length || result[0].score > 0.4) { // You can adjust the score threshold based on your needs
            return false;
        }
    }

    // If all criteria are met, return true
    return true;
}

export function filterItemsByUrl(items, url, bannedKeywords) {
    const searchParams = parseVintedSearchParams(url);
    if (!searchParams) return [];

    return items.filter(item => matchVintedItemToSearchParams(item, searchParams, bannedKeywords));
}

export { parseVintedSearchParams };
