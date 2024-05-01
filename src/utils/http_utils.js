import axios from 'axios';
import Logger from './logger.js';

/**
 * Makes an HTTP GET request with specified options.
 * @param {string} url - The URL to which the request is sent.
 * @param {Object} headers - Optional headers for the request.
 * @param {string} proxy - Optional proxy to route the request through.
 * @returns {Promise} - A promise that resolves with the response body or rejects with an error.
 */
async function makeGetRequest(url, headers = {}, proxyConfig = null) {
    let agent = proxyConfig ? proxyConfig.getProxyAgent() : null;

    const options = {
        url: url,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            ...headers
        },
        httpsAgent: agent,
        httpAgent: agent
    };

    return axios(options)
        .then(response => ({ response, body: response.data }))
        .catch(error => {
            const errorMessage = error.response ? `Failed to fetch data: ${error.response.status} ${error.response.statusText}` : `Network or proxy error: ${error.message}`;
            Logger.error(errorMessage);
            throw new Error(errorMessage);
        });
}

export default makeGetRequest;