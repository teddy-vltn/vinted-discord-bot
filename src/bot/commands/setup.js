import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import t from "../../t.js";
import { sendErrorEmbed, sendWaitingEmbed } from "../components/base_embeds.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Setup the bot.");

export async function execute(interaction) {
  try {
    const l = interaction.locale;
    await sendWaitingEmbed(interaction, t(l, "please-wait"));

    const discordId = interaction.user.id;

    const createChannelButton = new ButtonBuilder()
      .setCustomId("create_private_channel")
      .setLabel("Create Private Channel")
      .setStyle(ButtonStyle.Primary);

    const deleteChannelButton = new ButtonBuilder()
      .setCustomId("delete_private_channel")
      .setLabel("Delete Private Channel")
      .setStyle(ButtonStyle.Danger);

    const mentionsButton = new ButtonBuilder()
      .setCustomId("set_mentions")
      .setLabel("Set Mentions")
      .setStyle(ButtonStyle.Secondary);

    const startMonitoringButton = new ButtonBuilder()
      .setCustomId("start_monitoring")
      .setLabel("Start Monitoring")
      .setStyle(ButtonStyle.Success);

    const stopMonitoringButton = new ButtonBuilder()
      .setCustomId("stop_monitoring")
      .setLabel("Stop Monitoring")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      createChannelButton,
      deleteChannelButton,
      mentionsButton
    );
    const row2 = new ActionRowBuilder().addComponents(
      startMonitoringButton,
      stopMonitoringButton
    );

    const embed = new EmbedBuilder()
      .setTitle("Setup")
      .setDescription(
        "This command will guide you through the setup process for the bot."
      )
      .setColor("#2f3136")
      .addFields(
        {
          name: "1. Create a private channel",
          value:
            "```md\n + Create a private channel where the bot will post messages from Vinted. \n + You can create a channel by clicking on the 'Create Private Channel' button below.```",
        },
        {
          name: "2. Delete a private channel",
          value:
            "```md\n + Delete a private channel where the bot will post messages from Vinted. \n + You can delete a channel by clicking on the 'Delete Private Channel' button below.```",
        },
        {
          name: "3. Set up mentions",
          value:
            "```md\n + Set up mentions for a channel where the bot will post messages from Vinted. \n + You can set up mentions by clicking on the 'Set Mentions' button below.```",
        },
        {
          name: "4. Start monitoring a channel",
          value:
            "```md\n + Start monitoring a channel where the bot will post messages from Vinted. \n + You can start monitoring a channel by clicking on the 'Start Monitoring' button below.```",
        },
        {
          name: "5. Stop monitoring a channel",
          value:
            "```md\n + Stop monitoring a channel where the bot will post messages from Vinted. \n + You can stop monitoring a channel by clicking on the 'Stop Monitoring' button below.```",
        }
      );
    interaction.editReply({ embeds: [embed], components: [row, row2] });
  } catch (error) {
    console.error(`Error retrieving info:`, error);
    await sendErrorEmbed(
      interaction,
      "There was an error retrieving the info."
    );
  }
}
