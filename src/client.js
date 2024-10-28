import pkg, {
  ActionRowBuilder,
  IntentsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { handleCommands, registerCommands } from "./bot/commands_handler.js";
import crud from "./crud.js";
import { getChannelStart } from "./utils/channel-manager/getChannelStart.js";
import { getChannelStop } from "./utils/channel-manager/getChannelStop.js";
import ConfigurationManager from "./utils/config_manager.js";
import Logger from "./utils/logger.js";
const { Client, GatewayIntentBits } = pkg;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.Guilds,
  ],
});

const discordConfig = ConfigurationManager.getDiscordConfig;
const devMode = ConfigurationManager.getDevMode;

client.once("ready", async () => {
  Logger.info("Client is ready!");
  await registerCommands(client, discordConfig);
  if (devMode) {
    client.user.setPresence({
      activities: [{ name: "in dev mode" }],
      status: "online",
    });
  } else {
    client.user.setPresence({
      activities: [{ name: "Vinted" }],
      status: "online",
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const customId = interaction.customId;
    switch (customId) {
      case "set_mentions":
        import("./utils/channel-manager/setMentions.js").then(
          ({ setMentions }) => {
            setMentions(interaction);
          }
        );
        break;
      case "create_private_channel": {
        const modal = new ModalBuilder()
          .setCustomId("createPrivateChannelModal")
          .setTitle("Create a private channel");

        // Create the text input components
        const channelNameInput = new TextInputBuilder()
          .setCustomId("channel_name")
          .setLabel("Write a name for your private channel")
          .setStyle(TextInputStyle.Short);

        const firstActionRow = new ActionRowBuilder().addComponents(
          channelNameInput
        );

        // Add inputs to the modal
        modal.addComponents(firstActionRow);

        // Show the modal to the user
        await interaction.showModal(modal);
        break;
      }
      case "delete_private_channel":
        import("./utils/channel-manager/deletePrivateChannel.js").then(
          ({ deletePrivateChannel }) => {
            deletePrivateChannel(interaction);
          }
        );
        break;
      case "start_monitoring": {
        const monitoringModal = new ModalBuilder()
          .setCustomId("monitoringModal")
          .setTitle("Start monitoring a Vinted channel");

        // Create the text input components
        const monitoringUrlInput = new TextInputBuilder()
          .setCustomId("monitoring_url")
          .setLabel("Paste the URL of the Vinted product page")
          .setStyle(TextInputStyle.Short);

        const monitoringKeywordsInput = new TextInputBuilder()
          .setCustomId("monitoring_keywords")
          .setLabel("Enter keywords to ban from the search results")
          .setPlaceholder(
            'Enter keywords to ban from the search results (separate with commas -> "keyword1, keyword2")'
          )
          .setRequired(false)
          .setStyle(TextInputStyle.Short);

        const firstActionRow = new ActionRowBuilder().addComponents(
          monitoringUrlInput
        );
        const secondActionRow = new ActionRowBuilder().addComponents(
          monitoringKeywordsInput
        );

        // Add inputs to the modal
        monitoringModal.addComponents(firstActionRow, secondActionRow);

        // Show the modal to the user
        await interaction.showModal(monitoringModal);
        break;
      }
      case "stop_monitoring":
        getChannelStop(interaction);
        break;
    }
  }
  if (interaction.isModalSubmit()) {
    const customId = interaction.customId;
    switch (customId) {
      case "createPrivateChannelModal":
        const channelName =
          interaction.fields.getTextInputValue("channel_name");
        import("./utils/channel-manager/createPrivateChannel.js").then(
          ({ createPrivateChannel }) => {
            createPrivateChannel(interaction, channelName);
          }
        );
        break;
      case "monitoringModal":
        const url = interaction.fields.getTextInputValue("monitoring_url");
        const keywords = interaction.fields.getTextInputValue(
          "monitoring_keywords"
        )
          ? interaction.fields.getTextInputValue("monitoring_keywords")
          : "";
        await getChannelStart(interaction, url, keywords);
        break;
    }
  }
});

// Change presence to show number of channels being monitored
setInterval(async () => {
  const channelCount = (await crud.getAllVintedChannels()).length;
  client.user.setPresence({
    activities: [{ name: `${channelCount} channels` }],
    status: "online",
  });
}, 60000);

client.on("interactionCreate", handleCommands);

client.login(discordConfig.token).then((token) => {
  Logger.info(`Logged in as ${client.user.tag}`);
});

export default client;
