import axios from 'axios';
import ProxyManager from './proxy_manager.js';
import { getRandom } from 'random-useragent';
import Logger from './logger.js';
import ConfigurationManager from './config_manager.js';

const BASE_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
    'Connection': 'close',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua-Mobile': '?0',
    'TE': 'trailers',
    'Priority': 'u=0, i',
};

// generate some random user-agent to pick from
class RequestBuilder {
    constructor(url, method = 'GET') {
        this.url = url;
        this.method = method.toUpperCase(); // default is GET, but can be POST, PUT, DELETE, etc.
        this.headers = { ...BASE_HEADERS };
        this.proxy = null;
        this.timeout = 3000; // default timeout in milliseconds
        this.params = {};
        this.data = null; // used for POST/PUT requests
        
        return this; // return the instance to allow chaining
    }

    // Set custom headers
    addHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
        return this;
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

        if (!this.headers['User-Agent']) {
            const userAgent = getRandom( (ua) => {
                return parseFloat(ua.browserVersion) >= 90;
            });

            this.headers['User-Agent'] = userAgent;

            Logger.debug(`Sending request to ${this.url} with user-agent: ${userAgent}`);
        }

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
            Logger.debug(`Error sending request to ${this.url}, status: ${error.response.status}`);
            this.proxy && ProxyManager.removeTemporarlyInvalidProxy(this.proxy);
            throw error;
        }
    }
}

RequestBuilder.get = (url) => new RequestBuilder(url, 'GET');
RequestBuilder.post = (url) => new RequestBuilder(url, 'POST');
RequestBuilder.put = (url) => new RequestBuilder(url, 'PUT');

export default RequestBuilder;