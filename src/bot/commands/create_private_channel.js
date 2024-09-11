import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import { createCategoryIfNotExists, createChannelIfNotExists } from '../../services/discord_service.js';
import t from '../../t.js';

import ConfigurationManager from '../../utils/config_manager.js';

export const data = new SlashCommandBuilder()
    .setName('create_private_channel')
    .setDescription('Create a private monitoring channel.')
    .addStringOption(option =>
        option.setName('channel_name')
            .setDescription('The name of the channel to be created.')
            .setRequired(true))
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to create the channel for.')
            .setRequired(false));

const allow_user_to_create_private_channels = ConfigurationManager.getPermissionConfig.allow_user_to_create_private_channels;

export async function execute(interaction) {
    try {
        const l = interaction.locale;
        await sendWaitingEmbed(interaction, t(l, 'creating-private-channel'));

        const categoryOption = 'Private Channels';
        const channelName = interaction.options.getString('channel_name');
        const discordId = interaction.options.getUser('user')?.id ?? interaction.user.id;

        const adminDiscordId = ConfigurationManager.getDiscordConfig.admin_id;

        if (!allow_user_to_create_private_channels && interaction.user.id !== adminDiscordId) {
            await sendErrorEmbed(interaction, t(l, 'not-allowed-to-create-private-channel'));
            return;
        }

        if (interaction.options.getUser('user') 
            && interaction.user.id !== adminDiscordId
            && interaction.options.getUser('user').id !== interaction.user.id
        ) {
            await sendErrorEmbed(interaction, t(l, 'user-not-admin'));
            return;
        }

        // Check if the user exists and has not exceeded the channel limit
        let user = await crud.getUserByDiscordId(discordId);

        if (user.channels.length >= user.maxChannels) {
            await sendErrorEmbed(interaction, t(l, 'channel-limit-exceeded', { limit: user.maxChannels }));
            return;
        }

        // Create the category if it does not exist
        const category = await createCategoryIfNotExists(interaction.guild.channels, categoryOption);

        // Create the private channel
        // cast discordId to integer
        const privateChannel = await createChannelIfNotExists(category, channelName, discordId);

        // Create the VintedChannel
        const channelId = privateChannel.id;
        const vintedChannel = await crud.createVintedChannel({
            channelId,
            name: channelName,
            isMonitoring: false,
            type: 'private',
            user: user._id,
            preferences: user.preferences
        });

        // Associate the channel with the user
        await crud.addChannelToUser(user._id, vintedChannel._id);

        const embed = await createBaseEmbed(
            interaction,
            t(l, 'private-channel-created'),
            t(l, 'private-channel-created-success', { channelName }),
            0x00FF00
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error creating private channel:', error);
        await sendErrorEmbed(interaction, 'There was an error creating the private channel.');
    }
}
