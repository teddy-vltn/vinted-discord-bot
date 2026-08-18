import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import Logger from "../utils/logger.js";
import ConfigurationManager from "../utils/config_manager.js";
import RequestBuilder from "../utils/request_builder.js";

const settings = ConfigurationManager.getAlgorithmSetting
const extension = settings.vinted_api_domain_extension

/**
 * Fetches the session cookie from the headers of the response to a GET request to the given URL.
 * @param {string} url
 * @returns {Promise<{cookie: string}>}
 * @throws {DetailedExecutionResultError}
 */
export async function fetchCookie() {
    return await executeWithDetailedHandling( async () => {
        const url = `https://www.vinted.${extension}`

        const response = await RequestBuilder.get(url).setNextProxy().send();

        if (response && response.headers['set-cookie']) {

            const cookies = response.headers['set-cookie'];
            // Vinted sends access_token_web twice: first an empty value (clearing the previous
            // session) and only then the valid JWT. The original .find() returned the empty one,
            // so /api/v2/catalog/items answered 401 invalid_authentication_token.
            const prefix = 'access_token_web=';
            const vintedCookie = cookies
                .filter(cookie => cookie.startsWith(prefix) && cookie.split(';')[0].length > prefix.length)
                .pop();
            if (vintedCookie) {
                const cookie = vintedCookie.split(';')[0];
                Logger.debug(`Fetched cookie: ${cookie}`);

                return { cookie: cookie };
            } else {
                throw new Error("Session cookie not found in the headers.");
            }
        }
        
        throw new Error("No cookies found in the headers.");
    });

}