import ProxyManager from "./src/utils/http_utils.js";
import { VintedItem } from "./src/entities/vinted_item.js";
import { filterItemsByUrl } from "./src/services/url_service.js";
import { Preference } from "./src/database.js";
import client from "./src/client.js";
import ConfigurationManager from "./src/utils/config_manager.js";
import { postMessageToChannel } from "./src/services/discord_service.js";
import { createVintedItemEmbed, createVintedItemActionRow } from "./src/bot/components/item_embed.js";
import { fetchCookie } from "./src/services/cookie_service.js";
import crud from "./src/crud.js";
import Logger from "./src/utils/logger.js";
import CatalogService from "./src/services/catalog_service.js";

const proxyConfig = ConfigurationManager.getRotatingProxyConfig();
ProxyManager.setProxy(proxyConfig);

const getCookie = async () => {
    const c = await fetchCookie('https://www.vinted.fr/catalog?');
    return c.cookie;
};

const refreshCookie = async () => {
    let found = false;
    while (!found) {
        try {
            const cookie = await getCookie();
            if (cookie) {
                found = true;
                return cookie;
            }
        } catch (error) {
            Logger.debug('Error fetching cookie');
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
};

const discordConfig = ConfigurationManager.getDiscordConfig();
const token = discordConfig.token;
let cookie = await refreshCookie();

setInterval(async () => {
    try {
        cookie = await refreshCookie();
    } catch (error) {
        Logger.debug('Error refreshing cookie');
    }
}, 60000 * 5);  // 60 seconds

const sendToChannel = async (item, user, vintedChannel) => {
    const { embed, photosEmbeds } = await createVintedItemEmbed(item);
    const actionRow = await createVintedItemActionRow(item);

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

let allMonitoringChannels = await crud.getAllMonitoredVintedChannels();

crud.eventEmitter.on('updated', async () => {
    allMonitoringChannels = await crud.getAllMonitoredVintedChannels();
    Logger.debug('Updated vinted channels');
});

const monitorChannels = () => {
    const handleItem = async (rawItem) => {
        const item = new VintedItem(rawItem);

        for (const vintedChannel of allMonitoringChannels) {
            const user = vintedChannel.user;
            const matchingItems = filterItemsByUrl([item], vintedChannel.url, vintedChannel.preferences.get(Preference.Countries) || []);

            if (matchingItems.length > 0) {
                await sendToChannel(item, user, vintedChannel);
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

monitorChannels();
