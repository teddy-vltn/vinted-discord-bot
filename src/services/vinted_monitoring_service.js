import VintedHandlerAPIBasic from "../handlers/vinted_handler_basic.js";
import VintedMonitor from "../monitor/vinted_monitor.js";
import ProxyHandler from "../handlers/proxy_handler.js";
import ConfigurationManager from "../utils/config_manager.js";
import Logger from "../utils/logger.js";

export default class VintedMonitoringService {
    constructor() {
        this.configManager = new ConfigurationManager(process.cwd() + '/config.yaml');
        const proxies = this.configManager.getProxies();
        const isProxyEnabled = this.configManager.isProxyEnabled();
        this.proxyHandler = null;
        this.lastItemIds = new Set();

        if (isProxyEnabled && proxies.length === 0) {
            Logger.error("Proxies are enabled but none are configured.");
            return null;
        }

        if (isProxyEnabled) {
            try {
                this.proxyHandler = new ProxyHandler(proxies);
                Logger.info("Proxy handler created, using proxies for requests.");
            } catch (error) {
                Logger.error(`Error creating proxy handler: ${error.message}`);
                return null;
            }
        }
    }

    startMonitoring(url, callback) {
        const interval = this.configManager.getInterval();
        const processItems = (items, firstRun) => {
            const newItems = items.filter(item => !this.lastItemIds.has(item.id));
            newItems.forEach(item => this.lastItemIds.add(item.id));
            
            if (!firstRun && newItems.length > 0) {
                callback(newItems);
            }
        };

        const vintedMonitor = new VintedMonitor(VintedHandlerAPIBasic, this.proxyHandler);
        vintedMonitor.startMonitoring(url, processItems, interval);
        return vintedMonitor;
    }
}
