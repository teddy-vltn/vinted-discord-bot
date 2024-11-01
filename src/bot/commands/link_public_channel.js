import { SlashCommandBuilder } from 'discord.js';
import { createBaseEmbed, sendErrorEmbed, sendWaitingEmbed } from '../components/base_embeds.js';
import crud from '../../crud.js';

export const data = new SlashCommandBuilder()
    .setName('link_public_channel')
    .setDescription('Create a public monitoring channel.')
    .addStringOption(option =>
        option.setName('url')
            .setDescription('The URL of the Vinted product page.')
            .setRequired(true));

export async function execute(interaction) {
    try {
        await sendWaitingEmbed(interaction, 'Creating public channel...');

        if (await crud.isUserAdmin(interaction) === false) {
            await sendErrorEmbed(interaction, 'You do not have permission to create a public channel.');
            return;
        }

        const url = interaction.options.getString('url');

        // Create the VintedChannel
        const channelId = interaction.channel.id;
        await crud.createVintedChannel({
            channelId,
            url: url,
            isMonitoring: true,
            type: 'public',
            user: null
        });

        const embed = await createBaseEmbed(
            interaction,
            'Public Channel Created',
            `Public channel has been linked successfully and is now monitoring [Vinted Search](${url}).`,
            0x00FF00
        );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error creating public channel:', error);
        await sendErrorEmbed(interaction, 'There was an error creating the public channel.');
    }
}
