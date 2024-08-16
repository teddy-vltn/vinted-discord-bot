import pkg, { IntentsBitField } from 'discord.js';
const { Client, GatewayIntentBits } = pkg;
import { registerCommands, handleCommands } from './bot/commands_handler.js';
import ConfigurationManager from './utils/config_manager.js';
import Logger from './utils/logger.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.Guilds,
    ]
});

const discordConfig = ConfigurationManager.getDiscordConfig;
const devMode = ConfigurationManager.getDevMode;

client.once('ready', async () => {
    Logger.info('Client is ready!');
    await registerCommands(client, discordConfig);
    if (devMode) {
        client.user.setPresence({ activities: [{ name: 'in dev mode' }], status: 'online' });
    } else {
        client.user.setPresence({ activities: [{ name: 'Vinted' }], status: 'online' });
    }
});

client.on('interactionCreate', handleCommands);

client.login(discordConfig.token).then((token) => {
    Logger.info(`Logged in as ${client.user.tag}`);
});

export default client;
