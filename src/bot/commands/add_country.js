import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import { Preference } from '../../database.js';
import t from '../../t.js';

export const data = new SlashCommandBuilder()
    .setName('add_country')
    .setDescription('Add a country to the whitelist for a user or a channel.')
    .addStringOption(option =>
        option.setName('type')
            .setDescription('The type to add the country to: "user" or "channel".')
            .setRequired(true)
            .addChoices(
                { name: 'User', value: 'user' },
                { name: 'Channel', value: 'channel' }
            ))
    .addStringOption(option =>
        option.setName('country_code')
            .setDescription('The country code to add to the whitelist.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('channel_id')
            .setDescription('The ID of the channel to add the country to (if type is "channel").')
            .setRequired(false));

// List of european continent country codes + us + uk + ca + aus            
const validCountryCodes = [
    'us', 'uk', 'ca', 'au', 'al', 'ad', 'at', 'by', 'be', 'ba', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'de', 'gr', 'hu', 'is', 'ie', 'it', 'lv', 'li', 'lt', 'lu', 'mk', 'mt', 'md', 'mc', 'me', 'nl', 'no', 'pl', 'pt', 'ro', 'sm', 'rs', 'sk', 'si', 'es', 'se', 'ch', 'va'
];

export async function execute(interaction) {
    try {
        const l = interaction.locale;
        await sendWaitingEmbed(interaction, t(l, 'adding-country'));

        const type = interaction.options.getString('type');
        const countryCode = interaction.options.getString('country_code');
        const channelId = interaction.options.getString('channel_id');
        const discordId = interaction.user.id;

        // Validate the country code
        if (!validCountryCodes.includes(countryCode)) {
            const text = t(l, 'invalid-country-code', { countryCode, validCountryCodes: validCountryCodes.join(', ') });
            await sendErrorEmbed(interaction, text);
            return;
        }

        let entity;
        if (type === 'user') {
            entity = await crud.addUserPreference(discordId, Preference.Countries, countryCode);
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

            // Add the country to the channel's preferences
            await crud.addVintedChannelPreference(channel.channelId, Preference.Countries, countryCode);
        }

        const embed = await createBaseEmbed(
            interaction,
            t(l, 'country-added'),
            t(l, 'country-has-been-added', { countryCode, type: t(l, type) }),
            0x00FF00
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error adding country to whitelist:', error);
        await sendErrorEmbed(interaction, 'There was an error adding the country to the whitelist.');
    }
}
