import ProxyManager from "./src/utils/http_utils.js";
import { VintedItem } from "./src/entities/vinted_item.js";

import { fetchCookie } from "./src/services/cookie_service.js";
import CatalogService from "./src/services/catalog_service.js";
import Logger from "./src/utils/logger.js";

import { filterItemsByUrl } from "./src/services/url_service.js";

import { Preference } from "./src/database.js";

import client from "./src/client.js";

import ConfigurationManager from "./src/utils/config_manager.js";

import { postMessageToChannel } from "./src/services/discord_service.js";

import { createVintedItemEmbed, createVintedItemActionRow } from "./src/bot/components/item_embed.js";

import crud from "./src/crud.js";
import { BaseInteraction, InteractionWebhook } from "discord.js";

const proxyConfig = ConfigurationManager.getRotatingProxyConfig();

ProxyManager.setProxy({ 
    host: proxyConfig.host,
    port: proxyConfig.port,
    username: proxyConfig.username,
    password: proxyConfig.password
});

let cookie = null;

const discordConfig = ConfigurationManager.getDiscordConfig();
const token = discordConfig.token;

const refreshCookie = async () => {
    let found = false
    while (!found) {
        try {
            let c = await fetchCookie('https://www.vinted.fr/catalog?')
            
            if (c.cookie) {
                cookie = c.cookie;
                found = true;
            }
        } catch (error) {
            Logger.debug('Error fetching cookie');
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
};

setInterval(async () => {
    try {
        refreshCookie();
    } catch (error) {
       Logger.debug('Error refreshing cookie');
    }
}, 60000 * 5);  // 60 seconds

(async () => {
    await refreshCookie();

    let vintedChannels = await crud.getAllVintedChannels();

    crud.eventEmitter.on('updated', async () => {
        vintedChannels = await crud.getAllVintedChannels();
        Logger.debug('Updated vinted channels');
    });

    await CatalogService.findHighestIDUntilSuccessful(cookie);

    setInterval(async () => {
        try {
            await CatalogService.fetchUntilCurrentAutomatic(cookie, (rawItem) => {

                if (!vintedChannels) {
                    Logger.error('No vinted channels found');
                    return;
                }

                const allMonitoringChannels = vintedChannels.filter(channel => channel.isMonitoring);
                const item = new VintedItem(rawItem);

                for (const vintedChannel of allMonitoringChannels) {

                    const user = vintedChannel.user;
                    let matchingItems;

                    matchingItems = filterItemsByUrl([item], vintedChannel.url, vintedChannel.preferences.get(Preference.Countries) || []);

                    if (matchingItems.length > 0) {
                        sendToChannel(item, user, vintedChannel);
                    }
                }
            });
        } catch (error) {
            console.error(error);
        }
    
    }, 10);

})();

async function sendToChannel(item, user, vintedChannel) {
    const { embed, photosEmbeds } = await createVintedItemEmbed(item);
    const actionRow = await createVintedItemActionRow( item);

    let doMentionUser = false;
    if (user) {
        doMentionUser = vintedChannel.preferences.get(Preference.Mention)
    }
    const mentionString = doMentionUser ? `<@${user.discordId}>` : '';

    await postMessageToChannel(
        token, 
        vintedChannel.channelId, 
        `${mentionString} `,
        [embed, ...photosEmbeds],
        [actionRow]
    );
}