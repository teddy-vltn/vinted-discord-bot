import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import ProxyManager from "../utils/http_utils.js";
import ConfigurationManager from "../utils/config_manager.js";

const extension = ConfigurationManager.getAlgorithmSetting.vinted_api_domain_extension

/**
 * Fetch all catalog categories from Vinted
 * @param {Object} params - Parameters for fetching catalog categories
 * @param {string} params.cookie - Cookie for authentication.
 * @returns {Promise<Object>} - Promise resolving to the fetched catalog categories
 */
export async function fetchCatalogInitializer({ cookie }) {
    return await executeWithDetailedHandling(async () => {
        const url = `https://www.vinted.${extension}/api/v2/catalog/initializers`;
        const headers = { 'Cookie': cookie };

        const response = await ProxyManager.makeGetRequest(url, headers);

        if (!response.success) {
            throw new NotFoundError("Error fetching catalog items.");
        }

        return { data: response.body.dtos };
    });
}