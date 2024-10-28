import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { sendErrorEmbed } from "../../bot/components/base_embeds.js";
import crud from "../../crud.js";
import t from "../../t.js";

export async function deletePrivateChannel(interaction) {
  try {
    const l = interaction.locale;

    const discordId = interaction.user.id;

    // Get the user and ensure they exist
    const user = await crud.getUserByDiscordId(discordId);
    if (!user) {
      await sendErrorEmbed(interaction, t(l, "user-not-found"), true);
      return;
    }

    const channels = user.channels;

    if (channels.length === 0) {
      await sendErrorEmbed(interaction, t(l, "no-channels-found"), true);
      return;
    }

    // Create a select menu for channel selection
    const channelMenu = new StringSelectMenuBuilder()
      .setCustomId("channel_delete_select" + discordId)
      .setPlaceholder("Select the private channel to delete")
      .addOptions(
        channels.map((channel) => ({
          label: channel.name,
          value: channel.channelId,
        }))
      );

    const row = new ActionRowBuilder().addComponents(channelMenu);
    if (!interaction.replied) {
      await interaction.reply({
        content: "Please select the private channel you want to delete:",
        components: [row],
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: "Please select the private channel you want to delete:",
        components: [row],
        ephemeral: true,
      });
    }

    // Create a collector for the channel selection
    const filter = (i) =>
      i.customId === "channel_delete_select" + discordId &&
      i.user.id === discordId;
    const channelCollector =
      interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000,
      });

    channelCollector.on("collect", async (channelInteraction) => {
      const channelId = channelInteraction.values[0];

      // Delete the VintedChannel
      await crud.deleteVintedChannelByChannelId(channelId);

      // Remove the channel from the user's channels list
      await crud.removeChannelFromUserByIds(interaction.user.id, channelId);

      try {
        await channelInteraction.update({
          content: `The private channel has been deleted.`,
          components: [],
        });
        const channelToDelete = await interaction.guild.channels.fetch(
          channelId
        );
        await channelToDelete.delete();
      } catch (error) {
        console.error("Error deleting private channel:", error);
        await sendErrorEmbed(
          interaction,
          "There was an error deleting the private channel, but was from the database: ```" +
            error +
            "```",
          true
        );
      }
    });
  } catch (error) {
    console.error("Error deleting private channel:", error);
    await sendErrorEmbed(
      interaction,
      "There was an error deleting the private channel."
    );
  }
}
