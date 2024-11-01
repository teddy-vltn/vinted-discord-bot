import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed, sendWarningEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import t from '../../t.js';
import Logger from '../../utils/logger.js';
import { Preference, ShippableMap } from '../../database.js';

export const data = new SlashCommandBuilder()
    .setName('start_monitoring')
    .setDescription('Start monitoring this Vinted channel.')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('The URL of the Vinted product page.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('banned_keywords')
            .setDescription('Keywords to ban from the search results. (separate with commas -> "keyword1, keyword2")')
            .setRequired(false));

// the base URL for monitoring Vinted products
const VALID_BASE_URL = "catalog";

// validate that the URL is a Vinted catalog URL with at least one query parameter
function validateUrl(url) {
    try {
        // check if the route is the valid base URL
        // https://www.vinted.fr/catalog?...
        // split and find the catalog route
        // split the / and find the last element and compare it to the VALID_BASE_URL
        let route = new URL(url).pathname.split('/').pop();

        if (route !== VALID_BASE_URL) {
            return "invalid-url-with-example";
        }
        
        const urlObj = new URL(url);
        const searchParams = urlObj.searchParams;
        // check if the URL has at least one query parameter
        if (searchParams.toString().length === 0) {
            return "must-have-query-params"
        }

        // cehck if there is at least a brand_ids[] or video_game_platform_ids[] query parameter
        if (!searchParams.has('brand_ids[]') && !searchParams.has('video_game_platform_ids[]')) {
            return "must-have-brand-query-param";
        }

        return true;
    } catch (error) {
        return "invalid-url";
    }
}

function urlContainsSearchTextParameter(url) {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;
    return searchParams.has('search_text');
}

// get .fr or other domain from the URL
function getDomainInUrl(url) {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.split('.').pop();

    // handle .co.uk and other domains get only uk
    if (domain === 'co') {
        domain = urlObj.hostname.split('.').slice(-2)[0];
    }

    return domain;
}

export async function execute(interaction) {
    const l = interaction.locale;
    await sendWaitingEmbed(interaction, t(l, 'starting-monitoring'));

    const url = interaction.options.getString('url');
    const bannedKeywords = interaction.options.getString('banned_keywords') ? interaction.options.getString('banned_keywords').split(',').map(keyword => keyword.trim()) : [];
    const discordId = interaction.user.id;
    const channelId = interaction.channel.id;

    // validate the URL
    const validation = validateUrl(url);
    if (validation !== true) {
        await sendErrorEmbed(interaction, t(l, validation));
        return;
    }

    try {
        // Get the user
        const user = await crud.getUserByDiscordId(discordId);
        if (!user) {
            await sendErrorEmbed(interaction, t(l, 'user-not-found'));
            return;
        }

        // Find the VintedChannel by channelId and ensure it's owned by the user
        const vintedChannel = user.channels.find(channel => channel.channelId === channelId && channel.user.equals(user._id));
        if (!vintedChannel) {
            await sendErrorEmbed(interaction, t(l, 'channel-not-found-nor-owned'));
            return;
        }

        // Check if URL is provided or present in the VintedChannel
        if (!url && !vintedChannel.url) {
            await sendErrorEmbed(interaction, t(l, 'provide-vaild-url') + " " + t(l, url));
            return;
        }

        // Check if the URL contains the search_text parameter
        if (urlContainsSearchTextParameter(url)) {
            await sendWarningEmbed(interaction, t(l, 'url-contains-search-text'));
        }

        const embed = await createBaseEmbed(
            interaction,
            t(l, 'monitoring-started'),
            t(l, 'monitoring-has-been-started', { url: url || vintedChannel.url}),
            0x00FF00
        );

        await interaction.followUp({ embeds: [embed] });

        const domain = getDomainInUrl(url);

        await crud.setVintedChannelPreference(channelId, Preference.Countries, [ ...ShippableMap[domain], domain]);
        await crud.setVintedChannelUpdatedAtNow(channelId);
        await crud.setVintedChannelBannedKeywords(channelId, bannedKeywords);

        // Update the VintedChannel with the provided URL (if any) and set isMonitoring to true
        await crud.startVintedChannelMonitoring(vintedChannel._id, url);
    } catch (error) {
        console.error('Error starting monitoring session:', error);
        await sendErrorEmbed(interaction, 'There was an error starting the monitoring session.');
    }
}
