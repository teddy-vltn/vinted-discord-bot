import { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendSuccessEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import { Preference } from '../../database.js';
import t from '../../t.js';

export const data = new SlashCommandBuilder()
    .setName('set_mentions')
    .setDescription('Enable or disable mentions for a channel.')
    .addStringOption(option =>
        option.setName('state')
            .setDescription('The state to set mentions to: "enable" or "disable".')
            .setRequired(true)
            .addChoices(
                { name: 'Enable', value: 'enable' },
                { name: 'Disable', value: 'disable' }
            ));

export async function execute(interaction) {
    try {
        const l = interaction.locale;
        await sendWaitingEmbed(interaction, t(l, 'updating-mentions'));

        const state = interaction.options.getString('state');
        const discordId = interaction.user.id;
        const mention = state === 'enable';

        // Fetch all channels associated with the user
        const user = await crud.getUserByDiscordId(discordId);
        const channels = user.channels;

        if (channels.length === 0) {
            await sendErrorEmbed(interaction, t(l, 'no-channels-found'));
            return;
        }

        // Create a select menu for channel selection
        const channelMenu = new StringSelectMenuBuilder()
            .setCustomId('channel_select' + discordId)
            .setPlaceholder('Select the channel to set mentions for')
            .addOptions(channels.map(channel => ({
                label: channel.name,
                value: channel.channelId
            })));

        const row = new ActionRowBuilder().addComponents(channelMenu);
        await interaction.followUp({
            content: 'Please select the channel you want to set mentions for:',
            components: [row],
            ephemeral: true,
        });

        // Create a collector for the channel selection
        const filter = i => i.customId === 'channel_select' + discordId && i.user.id === discordId;
        const channelCollector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        channelCollector.on('collect', async channelInteraction => {
            const channelId = channelInteraction.values[0];

            // Set the mention preference for the channel
            await crud.setVintedChannelPreference(channelId, Preference.Mention, mention);

            const status = mention ? 'enabled' : 'disabled';

            // remove the select menu
            await channelInteraction.update({
                content: `Mentions have been ${status} for the channel.`,
                components: [],
            });

            await crud.setVintedChannelUpdatedAtNow(channelId);
        });

    } catch (error) {
        console.error(`Error updating mentions:`, error);
        await sendErrorEmbed(interaction, 'There was an error updating mentions.');
    }
}
