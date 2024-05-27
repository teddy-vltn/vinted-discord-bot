import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import t from '../../t.js';
import Logger from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('stop_monitoring')
    .setDescription('Stop monitoring this Vinted channel.');

export async function execute(interaction) {
    const l = interaction.locale;
    await sendWaitingEmbed(interaction, t(l, 'stopping-monitoring'));

    const discordId = interaction.user.id;
    const channelId = interaction.channel.id;

    try {
        // Get the user
        const user = await crud.getUserByDiscordId(discordId);
        if (!user) {
            await sendErrorEmbed(interaction, t(l, 'user-not-found'));
            return;
        }

        // Find the VintedChannel by channelId and ensure it's owned by the user
        const vintedChannel = user.channels.find(channel => channel.channelId === channelId);
        if (!vintedChannel) {
            await sendErrorEmbed(interaction, t(l, 'channel-not-found-nor-owned'));
            return;
        }

        const embed = await createBaseEmbed(
            interaction,
            t(l, 'monitoring-stopped'),
            t(l, 'monitoring-has-been-stopped'),
            0xFF0000
        );

        await interaction.editReply({ embeds: [embed] });

        // Update the VintedChannel and set isMonitoring to false
        await crud.stopVintedChannelMonitoring(vintedChannel._id);

    } catch (error) {
        console.error('Error stopping monitoring session:', error);
        await sendErrorEmbed(interaction, 'There was an error stopping the monitoring session.');
    }
}
