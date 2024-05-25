import { URL } from 'url';
import Logger from '../utils/logger.js';
import { isSubcategory } from '../database.js';

function parseVintedSearchParams(url) {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const searchParams = {
            searchText: params.get('search_text') || "N/A",
            order: params.get('order') || "N/A",
            catalogIds: params.getAll('catalog[]') || [],
            brandIds: params.getAll('brand_ids[]') || [],
            sizeIds: params.getAll('size_ids[]') || [],
            priceFrom: params.get('price_from') || "N/A",
            priceTo: params.get('price_to') || "N/A",
            statusIds: params.getAll('status_ids[]') || [],
            materialIds: params.getAll('material_ids[]') || [],
            colorsIds: params.getAll('color_ids[]') || []
        };

        return searchParams;
    } catch (error) {
        Logger.error("Invalid URL provided: ", error.message);
        return null;
    }
}

function matchVintedItemToSearchParams(item, searchParams, countries_codes = []) {
    // Check country codes
    if (countries_codes.length > 0 && !countries_codes.includes(item.user.countryCode)) {
        return false;
    }

    // Check search text
    if (searchParams.searchText && searchParams.searchText !== "N/A" &&
        (
            !item.title.toLowerCase().includes(searchParams.searchText.toLowerCase()) &&
            !item.description.toLowerCase().includes(searchParams.searchText.toLowerCase()) &&
            !item.brand.toLowerCase().includes(searchParams.searchText.toLowerCase()) &&
            !item.size.toLowerCase().includes(searchParams.searchText.toLowerCase())
        )
    ) {
        return false;
    }

    // Check catalog IDs
    if (searchParams.catalogIds.length > 0) {
        const itemCatalogId = item.catalogId;
        let isSub = false;
        
        for (const catalogId of searchParams.catalogIds) {
            if (isSubcategory(catalogId, itemCatalogId)) {
                isSub = true;
                break;
            }
        }

        if (!isSub) {
            return false;
        }
    }

    // Check brand IDs
    if (searchParams.brandIds.length > 0 && !searchParams.brandIds.includes(String(item.brandId))) {
        return false;
    }

    // Check size IDs
    if (searchParams.sizeIds.length > 0 && !searchParams.sizeIds.includes(String(item.sizeId))) {
        return false;
    }

    // Check status IDs
    if (searchParams.statusIds.length > 0 && !searchParams.statusIds.includes(String(item.statusId))) {
        return false;
    }

    // Check material IDs
    if (searchParams.materialIds.length > 0 && !searchParams.materialIds.includes(String(item.materialId))) {
        return false;
    }

    // Check color IDs
    if (searchParams.colorsIds.length > 0 && !searchParams.colorsIds.includes(String(item.colorId))) {
        return false;
    }

    // Check price range
    if (searchParams.priceFrom !== "N/A" && item.priceNumeric < searchParams.priceFrom) {
        return false;
    }

    if (searchParams.priceTo !== "N/A" && item.priceNumeric > searchParams.priceTo) {
        return false;
    }

    // If all criteria are met, return true
    return true;
}

export function filterItemsByUrl(items, url, countries_codes = []) {
    const searchParams = parseVintedSearchParams(url);
    if (!searchParams) return [];

    return items.filter(item => matchVintedItemToSearchParams(item, searchParams, countries_codes));
}