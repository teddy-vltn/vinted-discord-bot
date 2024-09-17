import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ForbiddenError, NotFoundError, RateLimitError, executeWithDetailedHandling } from '../helpers/execute_helper.js';
import randomUserAgent from 'random-useragent';
import Logger from './logger.js';
import { listProxies, Proxy } from './proxies.js';
import ConfigurationManager from './config_manager.js';
import fs from 'fs';

const proxy_settings = ConfigurationManager.getProxiesConfig
const algorithm_settings = ConfigurationManager.getAlgorithmSetting
const vinted_api_domain_extension = algorithm_settings.vinted_api_domain_extension;

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
    static proxies = [];
    static proxiesLoaded = false;
    static currentProxyIndex = 0;

    static async init(maxRetries = 3, retryDelay = 5000) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (proxy_settings.use_webshare) {
                    this.proxies = await listProxies(proxy_settings.webshare_api_key);
                    Logger.info(`Loaded ${this.proxies.length} proxies from Webshare.`);
                } else {
                    // Read the proxy file
                    const proxyFile = fs.readFileSync('proxies.txt', 'utf8');
                    const proxyLines = proxyFile.split('\n');

                    // Parse the proxy lines
                    for (const line of proxyLines) {
                        const parts = line.split(':');
                        if (parts.length === 4) {
                            const proxy = new Proxy(parts[0], parts[1], parts[2], parts[3]);
                            this.proxies.push(proxy);
                        }
                    }
                    Logger.info(`Loaded ${this.proxies.length} proxies from file.`);
                }
                return;
            } catch (error) {
                Logger.error(`Attempt ${attempt + 1} failed to initialize proxies: ${error.message}`);
                if (attempt === maxRetries - 1) {
                    Logger.error('Failed to initialize proxies after maximum retries');
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
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
    static async getNewProxy() {
        if (!this.proxiesLoaded) {
            await this.init()
            this.proxiesLoaded = true;
        }

        if (this.proxies.length > 0) {
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;

            const proxy = this.proxies[this.currentProxyIndex];

            return proxy
        }
        
        Logger.error('No proxies available.');

        return undefined;
    }

    /** 
     * Get New Proxy Socks Agent
     * @param {Proxy} proxy - The proxy to get the agent for
     * @returns {SocksProxyAgent} - The proxy agent
     */
    static getProxyAgent(proxy) {
        return new SocksProxyAgent(proxy.getProxyString());
    }
    

    /** 
     * Remove invalid proxies from the list
     * @param {Proxy} proxy - The proxy to remove
     * @returns {void}
     */
    static removeProxy(proxy) {
        this.proxies = this.proxies.filter(p => p !== proxy);
    }


    static removeTemporarlyInvalidProxy(proxy, timeout = 60000) {
        this.proxiesOnCooldown.push(proxy);
        this.proxies = this.proxies.filter(p => p !== proxy);

        setTimeout(() => {
            this.proxies.push(proxy);
            this.proxiesOnCooldown = this.proxiesOnCooldown.filter(p => p !== proxy);
        }, timeout);
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
            const proxy = await this.getNewProxy();

            const agent = this.getProxyAgent(proxy);

            if (!agent) {
                throw new Error('No proxy agent available.');
            }

            // Get a random user agent and extract the platform from it
            const userAgent = randomUserAgent.getRandom();
            const platform = Object.keys(PLATFORMS).find(key => userAgent.includes(PLATFORMS[key])) || 'Windows';

            // Prepare the cancel token and timeout
            const CancelToken = axios.CancelToken;
            const source = CancelToken.source();

            const timeout_value = 3000;

            // Set a timeout to cancel the request
            const timeoutId = setTimeout(() => {
                source.cancel('Request timed out after 1000ms');
            }, timeout_value);

            // Vinted APi domain extension
            const extension = vinted_api_domain_extension;

            // Prepare the request options
            const options = {
                url,
                method: 'GET',
                
                headers: {
                    // Set the user agent
                    'User-Agent': userAgent,
                    // Request gzip compression
                    'Accept-Encoding': 'gzip, deflate, br',
                    // Set the accept language
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    // Set cache control
                    'Cache-Control': 'no-cache',
                    // Set connection
                    'Connection': 'keep-alive',
                    // Set referer
                    'Referer': `https://vinted.${extension}/catalog`,
                    // Set origin
                    'Origin': `https://www.vinted.${extension}`,
                    // Set do not track
                    'DNT': '1',
                    // Set upgrade insecure requests
                    'Upgrade-Insecure-Requests': '1',
                    // Indicate that the request isn't from a mobile device
                    'Sec-Ch-Ua-Mobile': '?0',
                    // Set the agent platform
                    'Sec-Ch-Ua-Platform': platform,
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
                timeout: timeout_value,
                cancelToken: source.token
            };

            try {
                // Make the request and return the response with the response body
                Logger.debug(`Making GET request to ${url}`);
                const response = await axios(options);
                clearTimeout(timeoutId);  // Clear the timeout if the request completes successfully
                Logger.debug(`GET request to ${url} completed successfully`);
                return { response, body: response.data };
            } catch (error) {
                // Get the response status code if available
                const code = error.response ? error.response.status : null;

                Logger.debug(`Error making GET request: ${error.message}`);

                // Throw specific error based on the response status code
                if (code === 404) {
                    throw new NotFoundError("Resource not found.");
                } else if (code === 403) {
                    Logger.info(`Removing proxy ${proxy.ip}:${proxy.port} due to access forbidden error.`);
                    this.removeTemporarlyInvalidProxy(proxy);
                    throw new ForbiddenError("Access forbidden. IP: " + error.response);
                } else if (code === 429) {
                    Logger.info(`Removing proxy ${proxy.ip}:${proxy.port} due to rate limit error.`);
                    this.removeTemporarlyInvalidProxy(proxy, 20000);
                    throw new RateLimitError("Rate limit exceeded. IP: " + error.response);
                } else {
                    throw new Error(`Error making GET request: ${error.message}`);
                }
            }
        });
    }
}

export default ProxyManager;
