import axios from 'axios';
import ProxyManager from './proxy_manager.js';
import Logger from './logger.js';
import ConfigurationManager from './config_manager.js';

const algorithm_settings = ConfigurationManager.getAlgorithmSetting
const vinted_api_domain_extension = algorithm_settings.vinted_api_domain_extension;

// The user agent used to come from the random-useragent package with a browserVersion >= 50
// filter. Its database is from 2018 - the newest Chrome in it is 52, and Vinted answers such a
// user agent with HTTP 406, so the bot never received a cookie and looped forever.
// A fixed list of current browsers is rotated instead (all verified against vinted.cz: HTTP 200).
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
];

const BASE_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'fr=FR, en-US',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Origin': `https://www.vinted.${vinted_api_domain_extension}`,
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua-Mobile': '?0',
    'TE': 'trailers',
    'Sec-Ch-Ua-Mobile': '?1',
    'Priority': 'u=0, i',
};

class RequestBuilder {
    constructor(url, method = 'GET') {
        this.url = url;
        this.method = method.toUpperCase(); // default is GET, but can be POST, PUT, DELETE, etc.
        this.headers = { ...BASE_HEADERS };
        this.proxy = null;
        this.timeout = 5000; // default timeout in milliseconds
        this.params = {};
        this.data = null; // used for POST/PUT requests
        
        return this; // return the instance to allow chaining
    }

    // Set custom headers
    setHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
        return this; // return the instance to allow chaining
    }

    // Set proxy from proxy manager
    setProxy(proxy) {
        proxy = ProxyManager.getProxyAgent(proxy);

        this.proxy = proxy;
        return this;
    }

    // Set Next Proxy
    setNextProxy() {
        const proxy = ProxyManager.getNewProxy();
        this.setProxy(proxy);
        return this
    }

    // Set request timeout
    setTimeout(timeout) {
        this.timeout = timeout;
        return this;
    }

    // Add URL parameters (query parameters for GET/DELETE, or params for other methods)
    setParams(params) {
        this.params = { ...this.params, ...params };
        return this;
    }

    // Set request body data for POST/PUT/PATCH/DELETE requests
    setData(data) {
        this.data = data;
        return this;
    }

    // Change the HTTP method dynamically
    setMethod(method) {
        this.method = method.toUpperCase();
        return this;
    }

    setCookie(cookie) {
        this.headers['Cookie'] = cookie;
        return this;
    }

    // Build and send the request
    async send() {

        // Get a random user-agent
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

        Logger.debug(`Sending request to ${this.url} with user-agent: ${userAgent}`);

        this.headers['User-Agent'] = userAgent;

        const config = {
            method: this.method,
            url: this.url,
            headers: this.headers,
            agent: this.proxy,
            timeout: this.timeout,
            params: this.params,
            httpsAgent: this.proxy,
            httpAgent: this.proxy,
        };

        // If the method is POST, PUT, PATCH, DELETE, and body data exists, add it to the request
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(this.method) && this.data) {
            config.data = this.data;
        }

        try {
            const response = await axios(config);
            response.success = response.status >= 200 && response.status < 300;
            return response
        } catch (error) {
            // if response is a 404 it's not an error
            if (error.response && error.response.status === 404) {
                throw new Error('Not found');
            }

            // optional chaining: on a network failure or timeout axios reports an error without
            // a response, and the original line then crashed the whole bot with a TypeError.
            Logger.debug(`Error sending request to ${this.url}, status: ${error.response?.status}`);
            this.proxy && ProxyManager.removeTemporarlyInvalidProxy(this.proxy);
            throw error;
        }
    }
}

RequestBuilder.get = (url) => new RequestBuilder(url, 'GET');
RequestBuilder.post = (url) => new RequestBuilder(url, 'POST');
RequestBuilder.put = (url) => new RequestBuilder(url, 'PUT');

export default RequestBuilder;