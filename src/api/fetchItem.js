import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import ProxyManager from "../utils/http_utils.js";
import ConfigurationManager from "../utils/config_manager.js";

const extension = ConfigurationManager.getAlgorithmSetting.vinted_api_domain_extension

/**
 * Handle errors during item fetching based on response code.
 * @param {number} code - Response code.
 * @throws {Error} - Corresponding error based on response code.
 */
function handleFetchItemError(code) {
    switch (code) {
        case 404:
            throw new NotFoundError("Item not found.");
        case 403:
            throw new ForbiddenError("Access forbidden.");
        case 429:
            throw new RateLimitError("Rate limit exceeded.");
        default:
            throw new Error("Error fetching item.");
    }
}

/**
 * Fetch a specific item by ID from Vinted.
 * @param {Object} params - Parameters for fetching an item.
 * @param {string} params.cookie - Cookie for authentication.
 * @param {number} params.item_id - ID of the item to fetch.
 * @returns {Promise<Object>} - Promise resolving to the fetched item.
 */
export async function fetchItem({ cookie, item_id }) {
    return await executeWithDetailedHandling(async () => {
        const url = `https://www.vinted.${extension}/api/v2/items/${item_id}`;
        const headers = { 'Cookie': cookie };

        const response = await ProxyManager.makeGetRequest(url, headers);

        if (!response.success) {
            handleFetchItemError(response.code);
        }

        return { item: response.body.item };
    });
}