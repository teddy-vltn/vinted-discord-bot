import axios from "axios";
import ConfigurationManager from "../src/utils/config_manager.js";
import Logger from "../src/utils/logger.js";

const configManager = new ConfigurationManager(process.cwd() + '/config.yaml');
const proxies = configManager.getProxies();

// Test each proxy configuration
proxies.forEach(proxyConfig => {
    proxyBenchmarkTest(proxyConfig);
});

function proxyBenchmarkTest(proxyConfig) {
    const agent = proxyConfig.getProxyAgent();
    
    // Test the proxy by making a request to a test endpoint
    const testUrl = "https://httpbin.org/ip";
    const options = {
        url: testUrl,
        method: 'GET',
        httpsAgent: agent,
        httpAgent: agent
    };

    axios(options)
        .then(response => {
            Logger.info(`Proxy test successful: ${response.data.origin}`);
        })
        .catch(error => {
            Logger.error(`Proxy test failed: ${proxyConfig.toString()}`);
        });
}

