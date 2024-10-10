// main.js
import ProxyManager from "./src/utils/proxy_manager.js";
import { fetchCookie } from "./src/api/fetchCookie.js";
import { fetchCatalogInitializer } from "./src/api/fetchCatalogInitializers.js";
import FilterService from "./src/services/filter_service.js";
import PostService from "./src/services/post_service.js";
import ConfigurationManager from "./src/utils/config_manager.js";
import Logger from "./src/utils/logger.js";
import crud from "./src/crud.js";
import client from "./src/client.js";

import { buildCategoryMapFromRoots } from "./src/database.js";

var cookie = null;
 
try {
  await ProxyManager.init();
} catch (error) {
  Logger.error(`Failed to initialize proxies: ${error.message}`);
  Logger.info('Continuing without proxies...');
}

const algorithmSettings = ConfigurationManager.getAlgorithmSetting;
const discordConfig = ConfigurationManager.getDiscordConfig;
const token_sender = discordConfig.token_senders();

if (token_sender.length === 0) {
  token_sender.push(discordConfig.token);
}

const getCookie = async () => {
  const c = await fetchCookie();
  return c.cookie;
};

const refreshCookie = async () => {
  let found = false;
  while (!found) {
    try {
      const cookie = await getCookie();
      if (cookie) {
        found = true;
        Logger.info('Fetched cookie from Vinted');
        return cookie;
      }
    } catch (error) {
      Logger.debug('Error fetching cookie');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    setTimeout(() => {
      Logger.debug('Retrying to fetch cookie');
    }, 1000);
  }
};

Logger.info('Starting Vinted Bot');
cookie = await refreshCookie();

const getCatalogRoots = async (cookie) => {
  let found = false;
  while (!found) {
      try {
          const roots = await fetchCatalogInitializer( { cookie });
          if (roots) {
              buildCategoryMapFromRoots(roots);
              found = true;
              Logger.info('Fetched catalog roots from Vinted');
          }
      } catch (error) {
          Logger.debug('Error fetching catalog roots');
          console.error(error);
          await new Promise(resolve => setTimeout(resolve, 200));
      }
  }
}

Logger.info('Fetching catalog roots from Vinted');

await getCatalogRoots(cookie);

setInterval(async () => {
  try {
    cookie = await refreshCookie();
  } catch (error) {
    Logger.debug('Error refreshing cookie');
  }
}, 60000 * 5);

Logger.info('Fetching catalog roots');
await FilterService.initialize(cookie);

let allMonitoringChannels = await crud.getAllMonitoredVintedChannels();
Logger.info(`Monitoring ${allMonitoringChannels.length} Vinted channels`);

crud.eventEmitter.on('updated', async () => {
  allMonitoringChannels = await crud.getAllMonitoredVintedChannels();
  Logger.debug('Updated vinted channels');
});

const handleItem = async (item) => {
    const promises = allMonitoringChannels.map(async (vintedChannel) => {
        const user = vintedChannel.user;
        const matchingItems = FilterService.filterItems(item, vintedChannel);

        if (matchingItems.length > 0) {
            await PostService.sendToChannel(item, user, vintedChannel, token_sender, 0);
        }
    });

    // Process all the channels concurrently
    await Promise.all(promises);
};


Logger.info('Starting monitoring channels');
await FilterService.monitorCatalog(cookie, handleItem);

if (discordConfig.channel_inactivity_enabled) {
  setInterval(() => {
    checkVintedChannelInactivity(client);
  }, 1000 * 60 * 30);
}
