import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';
import t from '../../t.js';

import ConfigurationManager from '../../utils/config_manager.js';
const adminDiscordId = ConfigurationManager.getDiscordConfig.admin_id;

export const data = new SlashCommandBuilder()
    .setName('set_max_channels')
    .setDescription('Set the maximum number of channels for a user.')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user to set the maximum number of channels for.')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('max_channels')
            .setDescription('The maximum number of channels.')
            .setRequired(true));

export async function execute(interaction) {
    try {
        const l = interaction.locale;
        await sendWaitingEmbed(interaction, t(l, 'please-wait'));

        const discordId = interaction.options.getUser('user').id || interaction.user.id;
        const maxChannels = interaction.options.getInteger('max_channels');

        if (interaction.user.id !== adminDiscordId) {
            await sendErrorEmbed(interaction, t(l, 'not-authorized'));
            return;
        }

        // Set the maximum number of channels for the user
        const user = await crud.setUserMaxChannels(discordId, maxChannels);
        if (!user) {
            await sendErrorEmbed(interaction, t(l, 'user-not-found'));
            return;
        }

        const embed = await createBaseEmbed(
            interaction,
            t(l, 'max-channels-set'),
            t(l, 'max-channels-set-success', { maxChannels }),
            0x00FF00
        );

        embed.setFields([
            { name: `${t(l, 'user-id')}`, value: `${user._id} ` },
            { name: `${t(l, 'discord-id')}`, value: `${user.discordId} ` },
            { name: `${t(l, 'max-channels')}`, value: `${user.maxChannels} `, inline: true },
        ]);

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error(`Error setting max channels:`, error);
        await sendErrorEmbed(interaction, 'There was an error setting the max channels.');
    }
}
