import {
  createBaseEmbed,
  sendErrorEmbed,
} from "../../bot/components/base_embeds.js";
import crud from "../../crud.js";
import t from "../../t.js";

export async function stopMonitoring(interaction, channelId) {
  const l = interaction.locale;

  const discordId = interaction.user.id;

  try {
    // Get the user
    const user = await crud.getUserByDiscordId(discordId);
    if (!user) {
      await sendErrorEmbed(interaction, t(l, "user-not-found"), true);
      return;
    }

    // Find the VintedChannel by channelId and ensure it's owned by the user
    const vintedChannel = user.channels.find(
      (channel) => channel.channelId === channelId
    );
    if (!vintedChannel) {
      await sendErrorEmbed(
        interaction,
        t(l, "channel-not-found-nor-owned"),
        true
      );
      return;
    }

    const embed = await createBaseEmbed(
      interaction,
      t(l, "monitoring-stopped"),
      t(l, "monitoring-has-been-stopped"),
      0xff0000,
      true
    );

    // Update the VintedChannel and set isMonitoring to false
    await crud.stopVintedChannelMonitoring(vintedChannel._id);

    await crud.setVintedChannelUpdatedAtNow(channelId);

    if (interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error stopping monitoring session:", error);
    await sendErrorEmbed(
      interaction,
      "There was an error stopping the monitoring session.",
      true
    );
  }
}
