import { SlashCommandBuilder } from 'discord.js';
import { sendErrorEmbed, sendSuccessEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import t from '../../t.js';

export const data = new SlashCommandBuilder()
    .setName('force_delete_channel')
    .setDescription('Force deletes a channel (Admin only)')
    .addStringOption(option =>
        option.setName('channel_id')
            .setDescription('The ID of the channel to delete.')
            .setRequired(true));

export async function execute(interaction) {
    try {
        await sendWaitingEmbed(interaction, t(interaction.locale, 'please-wait'));
        const l = interaction.locale;

        // Ensure the user has the admin role
        if (crud.isUserAdmin(interaction) === false) {
            await sendErrorEmbed(interaction, t(l, 'admin-only'));
            return;
        }

        const channelId = interaction.options.getString('channel_id');

        // Check if the channel exists before attempting to delete
        const channelExists = await crud.checkVintedChannelExists(channelId);
        if (!channelExists) {
            await sendErrorEmbed(interaction, t(l, 'channel-not-found'));
            return;
        }

        // Delete the channel by channelId
        await crud.deleteVintedChannelByChannelId(channelId);

        // Remove the channel from the user's channels list
        await crud.removeChannelFromUserByIds(interaction.user.id, channelId);

        // Delete the actual Discord channel
        const discordChannel = interaction.guild.channels.cache.get(channelId);
        if (discordChannel) {
            await discordChannel.delete();
        }

        // Confirm successful deletion
        await sendSuccessEmbed(interaction, t(l, 'channel-deleted-success'));
    } catch (error) {
        console.error(`Error force deleting channel:`, error);
        await sendErrorEmbed(interaction, t(l, 'error-deleting-channel'));
    }
}
