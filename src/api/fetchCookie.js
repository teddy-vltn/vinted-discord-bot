import { executeWithDetailedHandling } from "../helpers/execute_helper.js";
import ProxyManager from "../utils/http_utils.js";
import Logger from "../utils/logger.js";
import ConfigurationManager from "../utils/config_manager.js";

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
        const url = `https://www.vinted.${extension}/catalog?`

        const {response,} = await ProxyManager.makeGetRequest(url);

        if (response && response.headers['set-cookie']) {

            const cookies = response.headers['set-cookie'];
            const vintedCookie = cookies.find(cookie => cookie.startsWith('_vinted_fr_session'));
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