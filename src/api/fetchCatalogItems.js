import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import RequestBuilder from "../utils/request_builder.js";
import ConfigurationManager from "../utils/config_manager.js";
import { NotFoundError, RateLimitError } from "../helpers/execute_helper.js";

const extension = ConfigurationManager.getAlgorithmSetting.vinted_api_domain_extension

/**
 * Builds the query string for the catalog endpoint.
 * Vinted expects multi-value filters as a comma separated list (catalog_ids=4,5),
 * so arrays are joined and empty values are skipped.
 * @param {Object} filters - Filters parsed from a channel URL.
 * @param {number} per_page - Number of items per page.
 * @param {string} order - Order of items.
 * @returns {URLSearchParams} - Query parameters for the request.
 */
function buildQuery(filters, per_page, order) {
    const params = new URLSearchParams({ per_page: String(per_page), order });

    for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined || value === '') {
            continue;
        }

        if (Array.isArray(value)) {
            if (value.length) {
                params.set(key, value.join(','));
            }
            continue;
        }

        params.set(key, String(value));
    }

    return params;
}

/**
 * Fetch catalog items from Vinted.
 * @param {Object} params - Parameters for fetching catalog items.
 * @param {string} params.cookie - Cookie for authentication.
 * @param {Object} [params.filters={}] - Search filters, e.g. { catalog_ids: [257], price_to: 500 }.
 * @param {number} [params.per_page=96] - Number of items per page.
 * @param {string} [params.order='newest_first'] - Order of items.
 * @returns {Promise<Object>} - Promise resolving to the fetched catalog items.
 */
export async function fetchCatalogItems({ cookie, filters = {}, per_page = 96, order = 'newest_first' }) {
    return await executeWithDetailedHandling(async () => {
        const query = buildQuery(filters, per_page, order);
        const url = `https://www.vinted.${extension}/api/v2/catalog/items?${query.toString()}`;

        // Axios already throws on 4xx, so without this translation a rate limit would hide
        // behind a generic 500 and the scheduler could not react to it.
        let response;
        try {
            response = await RequestBuilder.get(url)
                        .setNextProxy()
                        .setCookie(cookie)
                        .send();
        } catch (error) {
            if (error.response?.status === 429) {
                throw new RateLimitError("Rate limit exceeded.");
            }
            throw error;
        }

        if (!response.success) {
            throw new NotFoundError("Error fetching catalog items.");
        }

        return { items: response.data.items };
    });
}
