import VintedMonitoringService from "./src/services/vinted_monitoring_service.js";
import Logger from "./src/utils/logger.js";

/*
    This is a showcase of the VintedMonitoringService class.
    The service is used to monitor a Vinted catalog page and notify the user when new items are added.

    You can run it, but this is not linked with any bot
    The monitoring service will log the new items to the console.

    You can build around it and send whatever notifications you want to wherever 
    you want when new items are found.
*/

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

