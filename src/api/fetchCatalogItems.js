import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import ProxyManager from "../utils/http_utils.js";
import ConfigurationManager from "../utils/config_manager.js";

const extension = ConfigurationManager.getAlgorithmSetting.vinted_api_domain_extension

/**
 * Fetch catalog items from Vinted.
 * @param {Object} params - Parameters for fetching catalog items.
 * @param {string} params.cookie - Cookie for authentication.
 * @param {number} [params.per_page=96] - Number of items per page.
 * @param {string} [params.order='newest_first'] - Order of items.
 * @returns {Promise<Object>} - Promise resolving to the fetched catalog items.
 */
export async function fetchCatalogItems({ cookie, per_page = 96, order = 'newest_first' }) {
    return await executeWithDetailedHandling(async () => {
        const url = `https://www.vinted.${extension}/api/v2/catalog/items?per_page=${per_page}&order=${order}`;
        const headers = { 'Cookie': cookie };

        const response = await ProxyManager.makeGetRequest(url, headers);

        if (!response.success) {
            throw new NotFoundError("Error fetching catalog items.");
        }

        return { items: response.body.items };
    });
}
