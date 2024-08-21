import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import { createCategoryIfNotExists, createChannelIfNotExists } from '../../services/discord_service.js';
import crud from '../../crud.js';

import ConfigurationManager from '../../utils/config_manager.js';
const adminDiscordId = ConfigurationManager.getDiscordConfig.admin_id;

export const data = new SlashCommandBuilder()
    .setName('create_public_channel')
    .setDescription('Create a public monitoring channel.')
    .addStringOption(option =>
        option.setName('category')
            .setDescription('The name of the category to create the channel in.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('channel_name')
            .setDescription('The name of the channel to be created.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('url')
            .setDescription('The URL of the Vinted product page.')
            .setRequired(true));

export async function execute(interaction) {
    try {
        await sendWaitingEmbed(interaction, 'Creating public channel...');

        if (interaction.user.id !== adminDiscordId) {
            await sendErrorEmbed(interaction, 'You do not have permission to create a public channel.');
            return;
        }

        const categoryOption = interaction.options.getString('category');
        const channelName = interaction.options.getString('channel_name');
        const url = interaction.options.getString('url');

        // Create the category if it does not exist
        const category = await createCategoryIfNotExists(interaction.guild.channels, categoryOption);

        // Create the public channel
        const publicChannel = await createChannelIfNotExists(category, channelName);

        // Create the VintedChannel
        const channelId = publicChannel.id;
        await crud.createVintedChannel({
            channelId,
            name: channelName,
            url: url,
            isMonitoring: true,
            type: 'public',
            user: null
        });

        const embed = await createBaseEmbed(
            interaction,
            'Public Channel Created',
            `Public channel "${channelName}" has been created successfully and is now monitoring [Vinted Search](${url}).`,
            0x00FF00
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error creating public channel:', error);
        await sendErrorEmbed(interaction, 'There was an error creating the public channel.');
    }
}
