import VintedHandlerAPIBasic from "../handlers/vinted_handler_basic.js";
import VintedMonitor from "../monitor/vinted_monitor.js";
import ProxyHandler from "../handlers/proxy_handler.js";
import ConfigurationManager from "../utils/config_manager.js";
import Logger from "../utils/logger.js";

class VintedMonitoringService {
    constructor() {
        const configManager = new ConfigurationManager(process.cwd() + '/config.yaml');
        const proxies = configManager.getProxies();

        const isProxyEnabled = configManager.isProxyEnabled();

        this.proxyHandler = null;

        if (isProxyEnabled && proxies.length === 0) {
            Logger.error("Proxies are enabled but none are configured.");
            return null;
        }

        if (isProxyEnabled) {
            try {
                this.proxyHandler = new ProxyHandler(proxies);
                Logger.info("Proxy handler created, using proxies for requests.");
            }
            catch (error) {
                Logger.error(`Error creating proxy handler: ${error.message}`);
                return null;
            }
        }

        try { 
            this.vintedMonitor = new VintedMonitor(VintedHandlerAPIBasic, this.proxyHandler);
        }
        catch (error) {
            Logger.error(`Error creating VintedMonitor: ${error.message}`);
            return null;
        }
    }

    startMonitoring(url, callback, interval) {
        this.vintedMonitor.startMonitoring(url, callback, interval);
    }
}

export default VintedMonitoringService;
