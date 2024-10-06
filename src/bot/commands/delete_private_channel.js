import { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import t from '../../t.js';

export const data = new SlashCommandBuilder()
    .setName('delete_private_channel')
    .setDescription('Delete a private monitoring channel.');

export async function execute(interaction) {
    try {
        const l = interaction.locale;
        await sendWaitingEmbed(interaction, t(l, 'deleting-private-channel'));

        const discordId = interaction.user.id;

        // Get the user and ensure they exist
        const user = await crud.getUserByDiscordId(discordId);
        if (!user) {
            await sendErrorEmbed(interaction, t(l, 'user-not-found'));
            return;
        }

        const channels = user.channels;

        if (channels.length === 0) {
            await sendErrorEmbed(interaction, t(l, 'no-channels-found'));
            return;
        }

        // Create a select menu for channel selection
        const channelMenu = new StringSelectMenuBuilder()
            .setCustomId('channel_delete_select')
            .setPlaceholder('Select the private channel to delete')
            .addOptions(channels.map(channel => ({
                label: channel.name,
                value: channel.channelId
            })));

        const row = new ActionRowBuilder().addComponents(channelMenu);
        await interaction.followUp({
            content: 'Please select the private channel you want to delete:',
            components: [row],
            ephemeral: true,
        });

        // Create a collector for the channel selection
        const filter = i => i.customId === 'channel_delete_select' && i.user.id === discordId;
        const channelCollector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        channelCollector.on('collect', async channelInteraction => {
            const channelId = channelInteraction.values[0];

            // Delete the VintedChannel
            await crud.deleteVintedChannelByChannelId(channelId);

            // Remove the channel from the user's channels list
            await crud.removeChannelFromUserByIds(interaction.user.id, channelId);

            // Delete the actual Discord channel
            const discordChannel = interaction.guild.channels.cache.get(channelId);
            if (discordChannel) {
                await discordChannel.delete();
            }

            const embed = await createBaseEmbed(
                channelInteraction,
                t(l, 'private-channel-deleted'),
                t(l, 'private-channel-deleted-success', { channelId }),
                0xFF0000
            );

            await channelInteraction.update({ content: '', embeds: [embed], components: [] });
        });

    } catch (error) {
        console.error('Error deleting private channel:', error);
        await sendErrorEmbed(interaction, 'There was an error deleting the private channel.');
    }
}
