// src/services/filter_service.js
import { VintedItem } from "../entities/vinted_item.js";
import { filterItemsByUrl } from "./url_service.js";
import { Preference, buildCategoryMapFromRoots } from "../database.js";
import CatalogService from "./catalog_service.js";
import Logger from "../utils/logger.js";
import ConfigurationManager from "../utils/config_manager.js";

const councurrency = ConfigurationManager.getAlgorithmSetting.concurrent_requests

const FilterService = {
  initialize: async (cookie) => {
    Logger.info('Fetching catalog roots from Vinted');
    await CatalogService.findHighestIDUntilSuccessful(cookie);
  },

  filterItems: (item, vintedChannel) => {
    const matchingItems = filterItemsByUrl(
      [item],
      vintedChannel.url,
      vintedChannel.bannedKeywords,
      vintedChannel.preferences.get(Preference.Countries) || []
    );
    return matchingItems;
  },

  monitorCatalog: async (cookie, handleItem) => {
    CatalogService.initializeConcurrency( councurrency );

    await CatalogService.findHighestIDUntilSuccessful(cookie);
    
    while (true) {
      try {
        Logger.debug('Fetching catalog items');

        await CatalogService.fetchUntilCurrentAutomatic(cookie, async (rawItem) => {
          Logger.debug('Handling item');
          const item = new VintedItem(rawItem);
          
          handleItem(item);
        });
      } catch (error) {
        Logger.error('Error in catalog monitoring:', error);
      }
    }
  }
};

export default FilterService;
