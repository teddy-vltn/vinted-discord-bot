import VintedItem from '../entities/vinted_item.js';
import { fetchCookie } from '../security/cookie.js';
import makeGetRequest from '../utils/http_utils.js'; // Ensure this path is correct
import Logger from '../utils/logger.js';

const GET_NEW_COOKIE_INTERVAL = 60000 * 10; // 1 minute
const COOKIE_URL = 'https://www.vinted.fr/';

class VintedHandlerAPIBasic {
    constructor(proxy_handler = null) {
        this.proxy_handler = proxy_handler;
        this.cookies = new Map(); // stores cookies for each proxy
        this.cookieRefreshInterval = setInterval(() => this.refreshCookies(), GET_NEW_COOKIE_INTERVAL);
    }

    async fetchCookieForProxy(proxy = null) {
        return await fetchCookie(COOKIE_URL, proxy);
    }

    async getCookie(proxy = null) {
        if (!this.cookies.has(proxy) || !this.cookies.get(proxy).cookie) {
            const newCookie = await this.fetchCookieForProxy(proxy);
            this.cookies.set(proxy, { cookie: newCookie, lastUpdated: new Date() });
        }
        return this.cookies.get(proxy).cookie;
    }

    async refreshCookies() {
        for (const [proxy, cookieInfo] of this.cookies.entries()) {
            const timeSinceLastUpdate = new Date() - cookieInfo.lastUpdated;
            if (timeSinceLastUpdate >= GET_NEW_COOKIE_INTERVAL) {
                try {
                    const newCookie = await this.fetchCookieForProxy(proxy);
                    this.cookies.set(proxy, { cookie: newCookie, lastUpdated: new Date() });
                    Logger.info(`Refreshed cookie for proxy: ${proxy ? proxy.get : 'no_proxy'}`);
                } catch (error) {
                    Logger.error(`Failed to refresh cookie for proxy ${proxy ? proxy.toString() : 'no_proxy'}: ${error.message}`);
                }
            }
        }
    }

    async fetchItems(url) {
        let proxy = this.proxy_handler ? this.proxy_handler.getNextProxy() : null;
        const cookie = await this.getCookie(proxy);

        const headers = { 'Cookie': `${cookie}` };

        try {
            const { response, body } = await makeGetRequest(url, headers, proxy);
            if (response.status !== 200) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }

            const items = body.items.map(item => VintedItem.fromApiResponse(item));
            return items;
        } catch (error) {
            Logger.error(`Error fetching items: ${error.message}`);
            throw error;
        }
    }

    // Make sure to clear the interval when it's no longer needed
    cleanup() {
        clearInterval(this.cookieRefreshInterval);
    }
}

export default VintedHandlerAPIBasic;
