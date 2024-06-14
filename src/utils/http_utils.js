import axios, { isCancel } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ForbiddenError, NotFoundError, RateLimitError, executeWithDetailedHandling } from '../helpers/execute_helper.js';
import randomUserAgent from 'random-useragent';
import Logger from './logger.js';

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
            // Get the configured proxy agent
            const agent = this.getProxyAgent();

            // Get a random user agent and extract the platform from it
            const userAgent = randomUserAgent.getRandom();
            const platform = Object.keys(PLATFORMS).find(key => userAgent.includes(PLATFORMS[key])) || 'Windows';

            // Prepare the cancel token and timeout
            const CancelToken = axios.CancelToken;
            const source = CancelToken.source();

            // Set a timeout to cancel the request
            const timeoutId = setTimeout(() => {
                source.cancel('Request timed out after 1000ms');
            }, 1000);

            // Prepare the request options
            const options = {
                url,
                method: 'GET',
                
                headers: {
                    // Set the user agent
                    'User-Agent': userAgent,
                    // Request gzip compression
                    'Accept-Encoding': 'gzip, deflate, br',
                    // Set the agent platform
                    'Platform': platform,
                    // Set the accept language
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    // Set cache control
                    'Cache-Control': 'no-cache',
                    // Set connection
                    'Connection': 'keep-alive',
                    // Set referer
                    'Referer': 'https://vinter.fr/',
                    // Set origin
                    'Origin': 'https://www.vinted.fr/catalog',
                    // Set do not track
                    'DNT': '1',
                    // Set upgrade insecure requests
                    'Upgrade-Insecure-Requests': '1',
                    // Set fetch site
                    'Sec-Fetch-Site': 'same-origin',
                    // Set fetch mode
                    'Sec-Fetch-Mode': 'navigate',
                    // Set fetch user
                    'Sec-Fetch-User': '?1',
                    // Set fetch destination
                    'Sec-Fetch-Dest': 'document',
                    // Add transfer encoding support
                    'TE': 'Trailers',
                    // Control caching in HTTP/1.0 caches
                    'Pragma': 'no-cache',
                    // Set priority
                    'Priority': 'u=0, i',
                    // Merge custom headers with the default headers
                    ...headers
                },
                // Set the https agent and http agent to the proxy agent
                httpsAgent: agent,
                httpAgent: agent,
                // Set the response type to json
                responseType: 'json',
                // Set the timeout to 1000ms
                timeout: 500,
                cancelToken: source.token
            };

            try {
                // Make the request and return the response with the response body
                const response = await axios(options);
                clearTimeout(timeoutId);  // Clear the timeout if the request completes successfully
                return { response, body: response.data };
            } catch (error) {
                // Get the response status code if available
                const code = error.response ? error.response.status : null;

                // Throw specific error based on the response status code
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