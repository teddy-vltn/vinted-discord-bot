import VintedMonitoringService from "./src/services/vinted_monitoring_service.js";
import Logger from "./src/utils/logger.js";

const monitoringService = new VintedMonitoringService();

monitoringService.startMonitoring(
    "https://www.vinted.it/catalog/80-shorts",
    (items) => {
        items.forEach(item => {
            const space = " ".repeat(50 - item.title.length);
            Logger.info(`New item found: ${item.title}, ${space} ID: ${item.id}`);
        });
    },
    1000
);

Logger.info("Monitoring started");

