import VintedHandlerAPIBasic from "../handlers/vinted_handler_basic.js";
import VintedMonitor from "../monitor/vinted_monitor.js";
import ProxyHandler from "../handlers/proxy_handler.js";
import ConfigurationManager from "../utils/config_manager.js";
import Logger from "../utils/logger.js";

class VintedMonitoringService {
    constructor() {
        this.configManager = new ConfigurationManager(process.cwd() + '/config.yaml');
        const proxies = this.configManager.getProxies();

        const isProxyEnabled = this.configManager.isProxyEnabled();

        this.monitors = {};

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

    }

    startMonitoring(url, id, callback) {
        const interval = this.configManager.getInterval();
        
        const vintedMonitor = new VintedMonitor(VintedHandlerAPIBasic, this.proxyHandler);
        vintedMonitor.startMonitoring(url, callback, interval);
        
        this.monitors[id] = vintedMonitor;
    }

    stopMonitoring(id) {
        if (this.monitors[id]) {
            this.monitors[id].stopMonitoring();
            delete this.monitors[id];
        }
    }

    isMonitoring(id) {
        return this.monitors[id] !== undefined;
    }
}

export default VintedMonitoringService;
