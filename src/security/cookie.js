import makeGetRequest from '../utils/http_utils.js';
import Logger from '../utils/logger.js';

export async function fetchCookie(url, proxy) {
    try {
        const {response,} = await makeGetRequest(url, {}, proxy);

        if (response && response.headers['set-cookie']) {

            const cookies = response.headers['set-cookie'];
            const vintedCookie = cookies.find(cookie => cookie.startsWith('_vinted_fr_session'));
            if (vintedCookie) {
                return vintedCookie.split(';')[0];
            } else {
                throw new Error("Session cookie not found in the headers.");
            }
        }
        
        throw new Error("No cookies found in the headers.");
    } catch (error) {
        Logger.error(`Error fetching cookie: ${error.message}`);
        throw error;
    }
}

