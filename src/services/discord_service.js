import pkg from 'discord.js';
const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ChannelType } = pkg;
import ProxyManager from '../utils/proxy_manager.js';
import { ForbiddenError, NotFoundError, executeWithDetailedHandling } from '../helpers/execute_helper.js';
import axios from 'axios';
import Logger from '../utils/logger.js';
import crud from '../crud.js';
import ConfigurationManager from '../utils/config_manager.js';
import { createBaseEmbed } from '../bot/components/base_embeds.js';
import t from '../t.js';

const discordConfig = ConfigurationManager.getDiscordConfig
const guild_id = discordConfig.guild_id;
const thread_channel_id = discordConfig.thread_channel_id;

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

export async function createPrivateThread(
  category,
  threadName,
  discordId = null,
) {
  // Get the channel in which to create the thread
  const channel = await category.guild.channels.fetch(thread_channel_id);
  if (!channel) throw new Error("Le channel spécifié est introuvable.");

  // Create the thread
  const thread = await channel.threads.create({
    name: threadName,
    type: ChannelType.PrivateThread,
    reason: "...",
  });

  // if the user is specified, add them to the thread
  if (discordId) {
    try {
      const member = await category.guild.members.fetch(discordId);
      await thread.members.add(member.id);
    } catch (error) {
      console.error("Erreur lors de l'ajout du membre au fil :", error);
    }
  }

  return thread;
}

// Helper function to calculate the time difference in hours
function hoursAgo(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    return diffMs / (1000 * 60 * 60); // convert ms to hours
}

export async function checkVintedChannelInactivity(client) {
    try {
        // Fetch all Vinted channels from the database
        const channels = await crud.getAllPrivateVintedChannels();
        
        for (const channel of channels) {
            const { lastUpdated, user, channelId, keepMessageSent } = channel;

            // Skip if the keep message has already been sent
            if (keepMessageSent) continue;

            // Check if the lastUpdated is more than 72 hours ago
            if (hoursAgo(lastUpdated) > discordConfig.channel_inactivity_hours) {
                const userData = await crud.getUserById(user);
                if (!userData) continue;

                // check if the user is still in the server
                const member = await client.guilds.cache.get(guild_id).members.fetch(userData.discordId).catch(() => null);

                if (!member) {
                    console.log('User is no longer in the server, deleting the channel');
                    // User is no longer in the server, delete the channel
                    await crud.deleteVintedChannelByChannelId(channelId);
                    continue;
                }

                // Prepare a message to ask if they want to keep the channel
                const embed = await createBaseEmbed(
                    null, // no interaction needed here
                    t(user.locale, 'channel-inactivity-warning'),
                    t(user.locale, 'reply-to-keep-channel', { channelName: `<#${channelId}>`, time: 24 }),
                    0xFFA500
                );

                // Create action buttons for "Keep" and "Delete"
                const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setStyle(1).setCustomId('keep_channel' + userData.discordId).setLabel(t(user.locale, 'keep-channel')),
                    new ButtonBuilder().setStyle(4).setCustomId('delete_channel' + userData.discordId).setLabel(t(user.locale, 'delete-channel'))
                );

                // Send the message to the user via DM
                const message = await member.send({ embeds: [embed], components: [row] });

                await crud.setVintedChannelKeepMessageSent(channelId, true);

                // Create a message component collector to wait for the user's response
                const filter = i => i.user.id === userData.discordId;
                const collector = message.createMessageComponentCollector({
                    filter,
                    time: discordConfig.channel_inactivity_delete_hours * 60 * 60 * 1000, // 24 hours in milliseconds
                });

                collector.on('collect', async interaction => {
                    if (interaction.customId === 'keep_channel' + userData.discordId) {
                        // User wants to keep the channel
                        await crud.setVintedChannelUpdatedAtNow(channelId);
                        await crud.setVintedChannelKeepMessageSent(channelId, false);
                        await interaction.reply({ content: t(user.locale, 'channel-kept'), ephemeral: true });
                    } else if (interaction.customId === 'delete_channel' + userData.discordId) {
                        // User wants to delete the channel
                        await crud.deleteVintedChannelByChannelId(channelId);

                        await interaction.reply({ content: t(user.locale, 'channel-deleted'), ephemeral: true });

                        // Delete the channel if it still exists
                        const discordChannel = client.guilds.cache.get(guild_id).channels.cache.get(channelId);
                        if (discordChannel) {
                            await discordChannel.delete();
                        }
                    }
                });

                collector.on('end', async collected => {
                    // If no response is collected after 24 hours, delete the channel
                    if (collected.size === 0) {
                        await crud.deleteVintedChannelByChannelId(channelId);
                        await member.send(t(user.locale, 'channel-deleted'));
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error checking Vinted channel inactivity:', error);
    }
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

