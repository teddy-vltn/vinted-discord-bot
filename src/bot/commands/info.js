import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import t from '../../t.js';
import { Preference } from '../../database.js';

export const data = new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show information about the user or a specific channel.')
    .addStringOption(option =>
        option.setName('type')
            .setDescription('The type of info to retrieve: "user" or "channel".')
            .setRequired(true)
            .addChoices(
                { name: 'User', value: 'user' },
                { name: 'Channel', value: 'channel' }
            ))
    .addStringOption(option =>
        option.setName('channel_id')
            .setDescription('The channel ID to get info for (if type is "Channel").')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('user_id')
            .setDescription('The user ID to get info for (if type is "user"). Nothing for self.')
            .setRequired(false));

export async function execute(interaction) {
    try {
        const l = interaction.locale;
        await sendWaitingEmbed(interaction, t(l, 'please-wait'));

        const type = interaction.options.getString('type');
        const channelId = interaction.options.getString('channel_id');
        const discordId = interaction.options.getString('user_id') || interaction.user.id;

        let embed;
        if (type === 'user') {
            const user = await crud.getUserByDiscordId(discordId);
            if (!user) {
                await sendErrorEmbed(interaction, t(l, 'user-not-found'));
                return;
            }

            embed = await createBaseEmbed(
                interaction,
                t(l, 'user-info'),
                t(l, 'user-info-success'),
                0x00FF00
            );

            const userNumberOfChannels = user.channels.length;

            embed.setFields([
                { name: `${t(l, 'user-id')}`, value: `${user._id} ` },
                { name: `${t(l, 'discord-id')}`, value: `${user.discordId} ` },
                { name: `${t(l, 'max-channels')}`, value: `${userNumberOfChannels} / ${user.maxChannels} `, inline: true },
                { name: `${t(l, 'country-whitelist')}`, value: `${user.preferences.get(Preference.Countries) || []} `, inline: true },
                { name: `${t(l, 'user-mentions')}`, value: `${user.preferences.get(Preference.Mention) || false} `, inline: true }
            ]);

        } else if (type === 'channel') {
            if (!channelId) {
                await sendErrorEmbed(interaction, t(l, 'channel-id-required'));
                return;
            }

            // Get the user
            const channel = await crud.getVintedChannelById(channelId)

            // Find the channel by id
            if (!channel) {
                await sendErrorEmbed(interaction, t(l, 'channel-not-found'));
                return;
            }

            embed = await createBaseEmbed(
                interaction,
                t(l, 'channel-info'),
                t(l, 'channel-info-success'),
                0x00FF00
            );

            embed.setFields([
                { name: `${t(l, 'channel-id')}`, value: `${channel._id} `},
                { name: `${t(l, 'channel-discord-id')}`, value: `${channel.channelId} ` },
                { name: `${t(l, 'name')}`, value: `${channel.name} `, inline: true },
                { name: `${t(l, 'url')}`, value: `${channel.url} ` },
                { name: `${t(l, 'monitoring')}`, value: `${channel.isMonitoring} `, inline: true },
                { name: `${t(l, 'type')}`, value: `${channel.type} `, inline: true },
                { name: `${t(l, 'country-whitelist')}`, value: `${channel.preferences.get(Preference.Countries) || []} `, inline: true },
                { name: `${t(l, 'user-mentions')}`, value: `${channel.preferences.get(Preference.Mention) || false} `, inline: true }
            ]);
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error(`Error retrieving info:`, error);
        await sendErrorEmbed(interaction, 'There was an error retrieving the info.');
    }
}
            