import { EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import t from '../../t.js';

/**
 * 
 * @param {Interaction} interaction - The original interaction.
 * @param {string} title - The title of the embed.
 * @param {string} description - The description of the embed.
 * @param {number} color - The color of the embed.
 */
async function createBaseEmbed(interaction, title, description, color) {
    const embed = new EmbedBuilder()
    .setTitle(`${title}`)
    .setDescription(`📄 ${description}`)
    .setColor(color)
    .setTimestamp();

    if (interaction) {
        let avatar = interaction.user.avatarURL();
        if (!avatar) {
            avatar = interaction.user.defaultAvatarURL;
        }
        
        embed.setFooter({
            text: `${interaction.user.username}`,
            iconURL: `${avatar}`
        });
    }

    return embed;
}

/**
 * 
 * @param {Interaction} interaction - The original interaction.
 * @param {string} description - The description of the embed.
 */
async function sendWaitingEmbed(interaction, description) {
    const l = interaction.locale;
    const embed = await createBaseEmbed(interaction, t(l, "please-wait"), description, 0x1DB954);

    await interaction.reply({ embeds: [embed] });
}

async function sendNotFoundEmbed(interaction, description) {
    const l = interaction.locale;
    const embed = await createBaseEmbed(interaction, t(l, "not-found"), description, 0xFF0000);

    await interaction.followUp({ embeds: [embed] });
}

async function sendErrorEmbed(interaction, description) {
    const l = interaction.locale;
    const embed = await createBaseEmbed(interaction, t(l, "error"), description, 0xFF0000);

    await interaction.followUp({ embeds: [embed] });
}

async function sendSuccessEmbed(interaction, title, description) {
    const embed = await createBaseEmbed(interaction, title, description, 0x00FF00);

    await interaction.followUp({ embeds: [embed] });
}

/**
 * 
 * @param {string} label - The label of the button.
 * @param {string} style - The style of the button.
 * @param {string} id - The id of the button.
 * @param {Function} callback - The callback function for the button.
 */
async function createBaseActionButton(interaction, label, style, id, callback) {
    const button = new ButtonBuilder()
        .setCustomId(`${id}`)
        .setLabel(`${label}`)
        .setStyle(`${style}`);

    const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        await i.deferUpdate();
        await callback(i);
        collector.stop();
    });

    return button;
}

/**
 * 
 * @param {string} label - The label of the button.
 * @param {string} url - The url of the button.
 */
async function createBaseUrlButton(label, url) {
    return new ButtonBuilder()
    .setLabel(`${label}`)
    .setStyle(ButtonStyle.Link)
    .setURL(`${url}`);
}

export { 
    createBaseEmbed, 
    sendWaitingEmbed,
    sendNotFoundEmbed,
    sendErrorEmbed,
    sendSuccessEmbed,
    createBaseActionButton, 
    createBaseUrlButton 
};