import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { sendErrorEmbed } from "../../bot/components/base_embeds.js";
import crud from "../../crud.js";
import t from "../../t.js";
import { startMonitoring } from "./startMonitoring.js";

export async function getChannelStart(interaction, url, keywords) {
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
      .setCustomId("channel_monitoring_select" + discordId)
      .setPlaceholder("Select the private channel to start monitoring to.")
      .addOptions(
        channels.map((channel) => ({
          label: channel.name,
          value: channel.channelId,
        }))
      );

    const row = new ActionRowBuilder().addComponents(channelMenu);
    if (!interaction.replied) {
      await interaction.reply({
        content:
          "Please select the private channel you want to start monitoring to:",
        components: [row],
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content:
          "Please select the private channel you want to start monitoring to:",
        components: [row],
        ephemeral: true,
      });
    }

    // Create a collector for the channel selection
    const filter = (i) =>
      i.customId === "channel_monitoring_select" + discordId &&
      i.user.id === discordId;
    const channelCollector =
      interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000,
      });

    channelCollector.on("collect", async (channelInteraction) => {
      const channelId = channelInteraction.values[0];
      if (interaction.replied) {
        await channelInteraction.deferUpdate({
          components: [],
        });
      }

      startMonitoring(interaction, url, keywords ? keywords : "", channelId);
    });
  } catch (error) {
    console.error("Error selecting channel for monitoring:", error);
    await sendErrorEmbed(
      interaction,
      "There was an error selecting the channel for monitoring.",
      true
    );
  }
}
