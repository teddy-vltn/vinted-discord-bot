import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import RequestBuilder from "../utils/request_builder.js";
import ConfigurationManager from "../utils/config_manager.js";
import { NotFoundError } from "../helpers/execute_helper.js";

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

        const response = await RequestBuilder.get(url)
                        .setNextProxy()
                        .setCookie(cookie)
                        .send();

        if (!response.success) {
            throw new NotFoundError("Error fetching catalog items.");
        }

        return { data: response.data.dtos };
    });
}