import ProxyManager from "./src/utils/http_utils.js";
import { VintedItem } from "./src/entities/vinted_item.js";
import { filterItemsByUrl } from "./src/services/url_service.js";
import { Preference, buildCategoryMapFromRoots } from "./src/database.js";
import client from "./src/client.js";
import ConfigurationManager from "./src/utils/config_manager.js";
import { postMessageToChannel } from "./src/services/discord_service.js";
import { createVintedItemEmbed, createVintedItemActionRow } from "./src/bot/components/item_embed.js";
import { fetchCookie } from "./src/api/fetchCookie.js";
import { fetchCatalogInitializer } from "./src/api/fetchCatalogInitializers.js";
import crud from "./src/crud.js";
import Logger from "./src/utils/logger.js";
import CatalogService from "./src/services/catalog_service.js";

var cookie = null;

try {
    await ProxyManager.init();
} catch (error) {
    Logger.error(`Failed to initialize proxies: ${error.message}`);
    Logger.info('Continuing without proxies...');
}

const algorithmSettings = ConfigurationManager.getAlgorithmSetting
CatalogService.initializeConcurrency(algorithmSettings.concurrent_requests);

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
    }
};


const discordConfig = ConfigurationManager.getDiscordConfig
const token = discordConfig.token;

Logger.info('Starting Vinted Bot');
Logger.info('Fetching cookie from Vinted');

cookie = await refreshCookie();

setInterval(async () => {
    try {
        cookie = await refreshCookie();
    } catch (error) {
        Logger.debug('Error refreshing cookie');
    }
}, 60000 * 5);  // 60 seconds

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

const sendToChannel = async (item, user, vintedChannel) => {
    // get the domain from the URL between vinted. and the next /
    const domain = vintedChannel.url.match(/vinted\.(.*?)\//)[1];
    const { embed, photosEmbeds } = await createVintedItemEmbed(item, domain);
    const actionRow = await createVintedItemActionRow(item, domain);

    const doMentionUser = user && vintedChannel.preferences.get(Preference.Mention);
    const mentionString = doMentionUser ? `<@${user.discordId}>` : '';

    try {
        await postMessageToChannel(
            token,
            vintedChannel.channelId,
            `${mentionString} `,
            [embed, ...photosEmbeds],
            [actionRow]
        );
    }
    catch (error) {
        Logger.debug('Error posting message to channel');
        Logger.debug(error);
    }

};

Logger.info('Fetching monitored channels');

let allMonitoringChannels = await crud.getAllMonitoredVintedChannels();

// Print the number of monitored channels
Logger.info(`Monitoring ${allMonitoringChannels.length} Vinted channels`);

crud.eventEmitter.on('updated', async () => {
    allMonitoringChannels = await crud.getAllMonitoredVintedChannels();
    Logger.debug('Updated vinted channels');
});

const monitorChannels = () => {
    const handleItem = async (rawItem) => {
        Logger.debug('Handling item');
        const item = new VintedItem(rawItem);

        if (item.getNumericStars() === 0 && algorithmSettings.filter_zero_stars_profiles) {
            return;
        }

        for (const vintedChannel of allMonitoringChannels) {
            const user = vintedChannel.user;
            const matchingItems = filterItemsByUrl([item], vintedChannel.url, vintedChannel.preferences.get(Preference.Countries) || []);

            if (matchingItems.length > 0) {
                sendToChannel(item, user, vintedChannel);
            }
        }
    };

    (async () => {
        await CatalogService.findHighestIDUntilSuccessful(cookie);

        while (true) {
            try {
                await CatalogService.fetchUntilCurrentAutomatic(cookie, handleItem);
            } catch (error) {
                console.error(error);
            }
        }
    })();
};

Logger.info('Starting monitoring channels');

monitorChannels();
