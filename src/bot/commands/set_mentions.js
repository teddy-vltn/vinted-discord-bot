import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import { Preference } from '../../database.js';
import t from '../../t.js';

export const data = new SlashCommandBuilder()
    .setName('set_mentions')
    .setDescription('Enable or disable mentions for the user or a channel.')
    .addStringOption(option =>
        option.setName('type')
            .setDescription('The type to set mentions for: "user" or "channel".')
            .setRequired(true)
            .addChoices(
                { name: 'User', value: 'user' },
                { name: 'Channel', value: 'channel' }
            ))
    .addStringOption(option =>
        option.setName('state')
            .setDescription('The state to set mentions to: "enable" or "disable".')
            .setRequired(true)
            .addChoices(
                { name: 'Enable', value: 'enable' },
                { name: 'Disable', value: 'disable' }
            ))
    .addStringOption(option =>
        option.setName('channel_id')
            .setDescription('The channel ID to set mentions for.')
            .setRequired(false));


export async function execute(interaction) {
    try {
        const l = interaction.locale;
        await sendWaitingEmbed(interaction, t(l, 'updating-mentions'));

        const type = interaction.options.getString('type');
        const state = interaction.options.getString('state');
        const channelId = interaction.options.getString('channel_id');
        const discordId = interaction.user.id;

        const mention = state === 'enable';
  
        let entity;
        if (type === 'user') {
            entity = await crud.setUserPreference(discordId, Preference.Mention, mention);
            if (!entity) {
                await sendErrorEmbed(interaction, t(l, 'user-not-found'));
                return;
            }
        } else if (type === 'channel') {
            if (!channelId) {
                await sendErrorEmbed(interaction, t(l, 'channel-id-required'));
                return;
            }

            // Get the user
            const user = await crud.getUserByDiscordId(discordId);

            // Find the channel by name
            const channel = crud.isUserOwnerOfChannel(user.channels, channelId);
            if (!channel) {
                await sendErrorEmbed(interaction, t(l, 'channel-not-found'));
                return;
            }

            // Set the mention preference for the channel
            await crud.setVintedChannelPreference(channelId, Preference.Mention, mention);
        }

        const status = mention ? 'enabled' : 'disabled';
        const embed = await createBaseEmbed(
            interaction,
            t(l, 'mentions-updated'),
            t(l, 'mentions-has-been-updated', { status: t(l, status), type: t(l, type) }),
            mention ? 0x00FF00 : 0xFF0000
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error(`Error updating mentions:`, error);
        await sendErrorEmbed(interaction, 'There was an error updating mentions.');
    }
}
