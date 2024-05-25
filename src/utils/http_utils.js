import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ForbiddenError, NotFoundError, RateLimitError, executeWithDetailedHandling } from '../helpers/execute_helper.js';
import randomUserAgent from 'random-useragent';
import Logger from './logger.js';
import { time } from 'discord.js';

// platform used to parse random user agent to get the correct platform, key is the platform name, value is the platform used in the user agent
const PLATFORMS = {
    'Windows': 'Windows',
    'macOS': 'Mac',
    'Linux': 'Linux',
    'Android': 'Android',
    'iOS': 'iPhone',
    'Windows Phone': 'Windows Phone'
};


/**
 * Static class for managing proxy settings and making HTTP requests with SOCKS authentication.
 */
class ProxyManager {
    static proxyConfig = null;

    /**
     * Sets the proxy configuration for all subsequent requests with optional authentication.
     * @param {string} host - The host of the socks proxy.
     * @param {number} port - The port number of the socks proxy.
     * @param {string} [username] - The username for proxy authentication (optional).
     * @param {string} [password] - The password for proxy authentication (optional).
     */
    static setProxy({ host, port, username = null, password = null }) {
        this.proxyConfig = `socks://${username}:${password}@${host}:${port}`;
    }

    /**
     * Clears the proxy configuration.
     */
    static clearProxy() {
        this.proxyConfig = null;
    }

    /**
     * Retrieves the current proxy agent if a proxy is configured.
     * @returns {SocksProxyAgent|undefined} The proxy agent or undefined if no proxy is set.
     */
    static getProxyAgent() {
        if (this.proxyConfig) {
            return new SocksProxyAgent(this.proxyConfig);
        }
        return undefined;
    }

    /**
     * Makes an HTTP GET request with specified options, using the configured proxy.
     * @param {string} url - The URL to which the request is sent.
     * @param {Object} headers - Optional headers for the request.
     * @returns {Promise} - A promise that resolves with the response body or rejects with an error.
     */
    static async makeGetRequest(url, headers = {}) {
        return await executeWithDetailedHandling(async () => {
            const agent = this.getProxyAgent();

            const userAgent = randomUserAgent.getRandom();
            let platform = userAgent.split(' ')[0];
            // cycle through platforms to get the correct platform, value is the platform used in the user agent
            platform = Object.keys(PLATFORMS).find(key => userAgent.includes(PLATFORMS[key]));

            const options = {
                url,
                method: 'GET',
                headers: {
                    'User-Agent': userAgent,
                    'Accept-Encoding': 'gzip, deflate, br', // Request gzip compression
                    // get agent platform
                    'Platform': platform || 'Windows',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Referer': 'https://vinter.fr/',
                    'Origin': 'https://www.vinted.fr/catalog',
                    'DNT': '1',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-User': '?1',
                    'Sec-Fetch-Dest': 'document',
                    'TE': 'Trailers', // Adds Transfer-Encoding support
                    'Pragma': 'no-cache', // Controls caching in HTTP/1.0 caches
                    'Priority': 'u=0, i',
                    ...headers
                },
                httpsAgent: agent,
                httpAgent: agent,
                responseType: 'json', // Ensure we receive JSON responses directly
                timeout: 1000
            };

            try {
                const response = await axios(options);
                return { response, body: response.data };
            } catch (error) {
                const code = error.response ? error.response.status : null;

                if (code === 404) {
                    throw new NotFoundError("Resource not found.");
                } else if (code === 403) {
                    throw new ForbiddenError("Access forbidden. IP: " + error.response);
                } else if (code === 429) {
                    throw new RateLimitError("Rate limit exceeded. IP: " + error.response);
                } else {
                    throw new Error(`Error making GET request: ${error.message}`);  
                }
            }
        });
    }
}

export default ProxyManager;