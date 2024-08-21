import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';

import ConfigurationManager from '../../utils/config_manager.js';
const adminDiscordId = ConfigurationManager.getDiscordConfig.admin_id;

export const data = new SlashCommandBuilder()
    .setName('delete_public_channel')
    .setDescription('Delete a public monitoring channel.')
    .addStringOption(option =>
        option.setName('channel_id')
            .setDescription('The ID of the channel to be deleted.')
            .setRequired(true));

export async function execute(interaction) {
    try {
        await sendWaitingEmbed(interaction, 'Deleting public channel...');

        if (interaction.user.id !== adminDiscordId) {
            await sendErrorEmbed(interaction, 'You do not have permission to delete a public channel.');
            return;
        }

        const channelId = interaction.options.getString('channel_id');

        // Find the VintedChannel by channelId
        const vintedChannel = await crud.getVintedChannelById(channelId);
        if (!vintedChannel || vintedChannel.type !== 'public') {
            await sendErrorEmbed(interaction, 'Public channel not found.');
            return;
        }

        // Delete the channel from Discord
        const channel = await interaction.guild.channels.cache.get(channelId);
        if (channel) {
            await channel.delete('Deleting public channel');
        }

        // Delete the VintedChannel from the database
        await crud.deleteVintedChannel(vintedChannel._id);

        const embed = await createBaseEmbed(
            interaction,
            'Public Channel Deleted',
            `Public channel with ID ${channelId} has been deleted successfully.`,
            0xFF0000
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error deleting public channel:', error);
        await sendErrorEmbed(interaction, 'There was an error deleting the public channel.');
    }
}
