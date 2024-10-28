import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { sendErrorEmbed } from "../../bot/components/base_embeds.js";
import crud from "../../crud.js";
import { Preference } from "../../database.js";
import t from "../../t.js";

export async function setMentions(interaction) {
  try {
    const l = interaction.locale;

    const userId = interaction.user.id;

    // Fetch all channels associated with the user
    const user = await crud.getUserByDiscordId(userId);
    const channels = user.channels;

    if (channels.length === 0) {
      await sendErrorEmbed(interaction, t(l, "no-channels-found"), true);
      return;
    }

    // Create a select menu for channel selection
    const channelMenu = new StringSelectMenuBuilder()
      .setCustomId("channel_select" + userId)
      .setPlaceholder("Select the channel to set mentions for")
      .addOptions(
        channels.map((channel) => ({
          label: channel.name,
          value: channel.channelId,
        }))
      );

    const row = new ActionRowBuilder().addComponents(channelMenu);
    await interaction.reply({
      content: "Please select the channel you want to set mentions for:",
      components: [row],
      ephemeral: true,
    });

    // Create a collector for the channel selection
    const filter = (i) =>
      i.customId === "channel_select" + userId && i.user.id === userId;
    const channelCollector =
      interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000,
      });

    channelCollector.on("collect", async (channelInteraction) => {
      const channelId = channelInteraction.values[0];

      const currentMention = await crud.getVintedChannelPreference(
        channelId,
        Preference.Mention
      );

      // Set the mention preference for the channel
      await crud.setVintedChannelPreference(
        channelId,
        Preference.Mention,
        !currentMention
      );

      const status = !currentMention ? "enabled" : "disabled";

      // remove the select menu
      await channelInteraction.update({
        content: `Mentions have been ${status} for the channel.`,
        components: [],
      });

      await crud.setVintedChannelUpdatedAtNow(channelId);
    });
  } catch (error) {
    console.error(`Error updating mentions:`, error);
    await sendErrorEmbed(interaction, "There was an error updating mentions.");
  }
}
