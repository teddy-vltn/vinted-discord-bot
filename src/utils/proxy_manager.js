import { SocksProxyAgent } from 'socks-proxy-agent';
import Logger from './logger.js';
import { listProxies, Proxy } from './proxies.js';
import ConfigurationManager from './config_manager.js';
import fs from 'fs';

const proxy_settings = ConfigurationManager.getProxiesConfig

/**
 * Static class for managing proxy settings and making HTTP requests with SOCKS authentication.
 */
class ProxyManager {
    static proxyConfig = null;
    static proxies = [];
    static proxiesLoaded = false;
    static currentProxyIndex = 0;
    static proxiesOnCooldown = [];

    static async init(maxRetries = 99, retryDelay = 5000) {
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
    static getNewProxy() {

        if (this.proxies.length > 0) {
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;

            const proxy = this.proxies[this.currentProxyIndex];

            return proxy
        }
        
        // debug instead of error: with no proxies this is the expected state on every request
        // and Logger.error builds a stack trace on each call (see logger.js getCallSource).
        Logger.debug('No proxies available.');

        return undefined;
    }

    /** 
     * Get New Proxy Socks Agent
     * @param {Proxy} proxy - The proxy to get the agent for
     * @returns {SocksProxyAgent} - The proxy agent
     */
    static getProxyAgent(proxy) {
        // With no proxy configured undefined is returned and axios sends the request directly.
        // The original code called proxy.getProxyString() on undefined, which dropped fetchCookie
        // into an endless retry loop in main.js and the bot never started.
        if (!proxy) {
            return undefined;
        }

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
}

export default ProxyManager;
