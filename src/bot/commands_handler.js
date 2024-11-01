import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/logger.js';
import ConfigurationManager from '../utils/config_manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

const command_id_channel = ConfigurationManager.getDiscordConfig.command_channel_id;

// Using dynamic imports to load command modules
async function loadCommands() {
    for (const file of commandFiles) {
        const module = await import(`./commands/${file}`);
        commands.push(module.data.toJSON());
    }
}

export async function registerCommands(client, discordConfig) {
    await loadCommands();  // Ensure all commands are loaded before registering
    const rest = new REST({ version: '9' }).setToken(discordConfig.token);
    try {
        Logger.info('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(discordConfig.client_id),
            { body: commands }
        );
        Logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error reloading commands:', error);
    }
}

export async function handleCommands(interaction) {
    if (!interaction.isCommand()) return;

    Logger.info(`Received command: ${interaction.commandName}`);

    const channel = interaction.channel;
    const isThread = channel.isThread();

    // Check if the command is allowed to be executed in the command channel or in thread channels
    if (interaction.channelId !== command_id_channel && !isThread) {
        await interaction.reply({ content: 'This command is not allowed in this channel. Please use <#'+command_id_channel+'> or one of your private channels.', ephemeral: true });
        return;
    }

    try {   
        const module = await import(`./commands/${interaction.commandName}.js`);
        await module.execute(interaction);
    } catch (error) {
        Logger.error('Error handling command:', error);

        // prevent crash if interaction is not found
        try {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
        catch (error) {
            Logger.error('Error replying to interaction:', error);
        }
    }
}
