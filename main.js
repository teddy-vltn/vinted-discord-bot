import ProxyManager from "./src/utils/proxy_manager.js";
import { Preference } from "./src/database.js";
import client from "./src/client.js";
import ConfigurationManager from "./src/utils/config_manager.js";
import { postMessageToChannel, checkVintedChannelInactivity } from "./src/services/discord_service.js";
import { createVintedItemEmbed, createVintedItemActionRow } from "./src/bot/components/item_embed.js";
import { fetchCookie } from "./src/api/fetchCookie.js";
import crud from "./src/crud.js";
import Logger from "./src/utils/logger.js";
import ChannelMonitorService from "./src/services/channel_monitor_service.js";

const COOKIE_REFRESH_INTERVAL_MS = 60000;
const COOKIE_RETRY_DELAY_MS = 200;
const INACTIVITY_CHECK_INTERVAL_MS = 1000 * 60 * 30;

var cookie = null;

try {
    await ProxyManager.init();
} catch (error) {
    Logger.error(`Failed to initialize proxies: ${error.message}`);
    Logger.info('Continuing without proxies...');
}

const algorithmSettings = ConfigurationManager.getAlgorithmSetting;
const discordConfig = ConfigurationManager.getDiscordConfig;
const token = discordConfig.token;

const refreshCookie = async () => {
    while (true) {
        try {
            const fetched = await fetchCookie();
            if (fetched.cookie) {
                Logger.info('Fetched cookie from Vinted');
                return fetched.cookie;
            }
        } catch (error) {
            Logger.debug('Error fetching cookie');
        }

        await new Promise(resolve => setTimeout(resolve, COOKIE_RETRY_DELAY_MS));
    }
};

Logger.info('Starting Vinted Bot');
Logger.info('Fetching cookie from Vinted');

cookie = await refreshCookie();

setInterval(async () => {
    try {
        cookie = await refreshCookie();
    } catch (error) {
        Logger.debug('Error refreshing cookie');
    }
}, COOKIE_REFRESH_INTERVAL_MS);

const sendToChannel = async (item, vintedChannel) => {
    // The domain in the channel URL decides which Vinted locale the links point to.
    const domainMatch = vintedChannel.url.match(/vinted\.(.*?)\//);
    const domain = domainMatch ? domainMatch[1] : algorithmSettings.vinted_api_domain_extension;

    const { embed, photosEmbeds } = await createVintedItemEmbed(item, domain);
    const actionRow = await createVintedItemActionRow(item, domain);

    const user = vintedChannel.user;
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

Logger.info('Starting monitoring channels');

await ChannelMonitorService.start({
    getChannels: () => crud.getAllMonitoredVintedChannels(),
    getCookie: () => cookie,
    intervalMs: algorithmSettings.monitor_interval_seconds * 1000,
    onItem: sendToChannel,
});

crud.eventEmitter.on('updated', async () => {
    await ChannelMonitorService.refresh();
    Logger.debug('Updated vinted channels');
});

if (discordConfig.channel_inactivity_enabled) {
    setInterval(() => {
        checkVintedChannelInactivity(client)
    }, INACTIVITY_CHECK_INTERVAL_MS);
}
