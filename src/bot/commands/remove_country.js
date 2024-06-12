import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import { Preference } from '../../database.js';
import t from '../../t.js';

export const data = new SlashCommandBuilder()
    .setName('remove_country')
    .setDescription('Remove a country from the whitelist for a user or a channel.')
    .addStringOption(option =>
        option.setName('type')
            .setDescription('The type to remove the country from: "user" or "channel".')
            .setRequired(true)
            .addChoices(
                { name: 'User', value: 'user' },
                { name: 'Channel', value: 'channel' }
            ))
    .addStringOption(option =>
        option.setName('country_code')
            .setDescription('The country code to remove from the whitelist.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('channel_id')
            .setDescription('The ID of the channel to remove the country from (if type is "channel").')
            .setRequired(false));

export async function execute(interaction) {
    try {
        const l = interaction.locale
        await sendWaitingEmbed(interaction, t(l, 'removing-country'));

        const type = interaction.options.getString('type');
        const countryCode = interaction.options.getString('country_code');
        const channelId = interaction.options.getString('channel_id');
        const discordId = interaction.user.id;

        let entity;
        if (type === 'user') {
            entity = await crud.removeUserPreference(discordId, Preference.Countries, countryCode);
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
            const channel = await crud.isUserOwnerOfChannel(user.channels, channelId);
            if (!channel) {
                await sendErrorEmbed(interaction, t(l, 'channel-not-found'));
                return;
            }

            // Remove the country from the channel's preferences
            await crud.removeVintedChannelPreference(channel.channelId, Preference.Countries, countryCode);
        }

        const embed = await createBaseEmbed(
            interaction,
            t(l, 'country-removed'),
            t(l, 'country-has-been-removed', { countryCode, type: t(l, type) }),
            0x00FF00
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error removing country from whitelist:', error);
        await sendErrorEmbed(interaction, 'There was an error removing the country from your whitelist.');
    }
}
            
