import pkg from 'discord.js';
const { PermissionsBitField } = pkg;
import ProxyManager from '../utils/http_utils.js';
import { ForbiddenError, NotFoundError, executeWithDetailedHandling } from '../helpers/execute_helper.js';
import axios from 'axios';
import Logger from '../utils/logger.js';

/**
 * Create a category on Discord if it doesn't exist.
 * @param {GuildChannelManager} channelManager - The channel manager of the guild.
 * @param {string} categoryName - The name of the category to be created.
 * @returns {Promise<CategoryChannel>} - The created or found category channel.
 */
export async function createCategoryIfNotExists(channelManager, categoryName) {
    let category = channelManager.cache.find(c => c.name === categoryName && c.type === 4);
    if (!category) {
        category = await channelManager.create({
            name: categoryName,
            type: 4 // GUILD_CATEGORY type
        });
    }
    return category;
}

/**
 * Create a channel on Discord if it doesn't exist within a category.
 * @param {CategoryChannel} category - The category in which to create the channel.
 * @param {string} channelName - The name of the channel to be created.
 * @returns {Promise<TextChannel>} - The created or found text channel.
 */
export async function createChannelIfNotExists(category, channelName, discordId=null) {
    let permissionOverwrites = [];
    if (discordId) {
        // block everyone from viewing the channel except the user
        permissionOverwrites = [
            {
                id: category.guild.id,
                deny: PermissionsBitField.Flags.ViewChannel,
                type: 'role'
            },
            {
                id: discordId,
                allow: PermissionsBitField.Flags.ViewChannel,
                type: 'member'
            }
        ];
    } else {
        // allow everyone to view the channel
        permissionOverwrites = [
            {
                id: category.guild.id,
                allow: PermissionsBitField.Flags.ViewChannel,
                type: 'role'
            }
        ];
    }

    const channel = await category.guild.channels.create({
        name: channelName,
        type: 0, // GUILD_TEXT type
        parent: category.id,
        permissionOverwrites
    });

    return channel;
}

/**
 * Posts a message to a Discord channel using a SOCKS proxy.
 * @param {string} token - The bot token for authentication.
 * @param {string} channelId - The ID of the channel to post the message to.
 * @param {string} content - The content of the message to post.
 * @param {Array} embeds - An array of embed objects.
 * @param {Array} components - An array of action row objects.
 * @returns {Promise} - A promise that resolves with the response or rejects with an error.
 */
export async function postMessageToChannel(
    token,
    channelId,
    content,
    embeds = [],
    components = [],
    retries = 3
) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

    const headers = {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "DiscordBot (https://your-url.com, 1.0.0)",
    };

    Logger.debug(`Posting message to channel ${channelId}`);

    const data = {
        content,
        embeds,
        components,
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const proxy = await ProxyManager.getNewProxy();
            const agent = ProxyManager.getProxyAgent(proxy);

            const options = {
                url,
                method: "POST",
                headers,
                data,
                httpsAgent: agent,
                httpAgent: agent,
                responseType: "json",
                decompress: true,
                maxContentLength: 10 * 1024 * 1024,
                maxRedirects: 5,
            };

            const response = await axios(options);
            return { response, body: response.data };
        } catch (error) {
            const code = error.response ? error.response.status : null;
            if (code === 404) {
                throw new NotFoundError("Channel not found.");
            } else if (code === 403) {
                throw new ForbiddenError("Access forbidden.");
            } else if (attempt < retries) {
                Logger.debug(`Attempt ${attempt + 1} failed. Retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 300)); 
            } else {
                throw new Error(
                    `Error posting message after ${retries + 1} attempts: ${
                        error.message
                    }`
                );
            }
        }
    }
}

