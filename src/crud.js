import { User, VintedChannel } from "./database.js";
import EventEmitter from "./utils/event_emitter.js";

import ConfigurationManager from "./utils/config_manager.js";
import { set } from "mongoose";

const userDefaultConfig = ConfigurationManager.getUserConfig
const discordAdminId = ConfigurationManager.getDiscordConfig.role_admin_id;

const eventEmitter = new EventEmitter();

// CRUD Operations for User

/**
 * Create a new user.
 * @param {Object} userData - The user data.
 * @returns {Promise<Object>} - The created user.
 */
async function createUser({ discordId, preferences = {}, channels = [], lastUpdated = new Date() }) {
    const user = new User({ discordId, preferences, channels, lastUpdated, maxChannels: userDefaultConfig.max_private_channels_default });
    const result = await user.save();
    eventEmitter.emit('updated');
    return result;
}

async function isUserAdmin(interaction) {
    return await interaction.member.roles.cache.some(role => role.id === discordAdminId);
}

async function isUserOwnerOfChannel(interaction, user_channels, channel_id, user_id=null) {

    // get role admin id
    if (await isUserAdmin(interaction)) {
        return true;
    }

    if (user_channels.includes(channel_id)) {
        return true;
    }

    if (user_id) {
        const user = await getUserById(user_id);
        if (user.channels.includes(channel_id)) {
            return true;
        }
    }

    return null;
}

/**
 * Get a user by their ID.
 * @param {string} id - The user ID.
 * @returns {Promise<Object>} - The user.
 */
async function getUserById(id) {
    return await User.findById(id).populate('channels');
}

/**
 * Get a user by their Discord ID.
 * @param {string} discordId - The Discord ID.
 * @returns {Promise<Object>} - The user.
 */
async function getUserByDiscordId(discordId) {
    let user = await User.findOne({ discordId }).populate('channels');

    if (!user) {
        await crud.createUser({ discordId });
        user = User.findOne({ discordId }).populate('channels');
    }

    return user
}

/**
 * Update a user.
 * @param {string} id - The user ID.
 * @param {Object} updateData - The update data.
 * @returns {Promise<Object>} - The updated user.
 */
async function updateUser(id, { discordId, preferences, channels, lastUpdated, timeMonitored }) {
    const update = { discordId, preferences, channels, lastUpdated, timeMonitored };
    const result = await User.findByIdAndUpdate(id, update, { new: true });
    eventEmitter.emit('updated');
    return result;
}

/**
 * Set the maximum number of channels a user can have.
 * @param {string} discordId - The Discord ID.
 * @param {number} maxChannels - The maximum number of channels.
 * @returns {Promise<Object>} - The updated user.
 */
async function setUserMaxChannels(discordId, maxChannels) {
    const user = await getUserByDiscordId(discordId);
    if (!user) {
        throw new Error('User not found');
    }
    user.maxChannels = maxChannels;
    const result = await user.save();
    eventEmitter.emit('updated');
    return result;
}

/**
 * Delete a user.
 * @param {string} id - The user ID.
 * @returns {Promise<Object>} - The deleted user.
 */
async function deleteUser(id) {
    return await User.findByIdAndDelete(id);
}

/**
 * Check if a user exists by their Discord ID.
 * @param {string} discordId - The Discord ID.
 * @returns {Promise<boolean>} - True if the user exists, false otherwise.
 */
async function checkUserExists(discordId) {
    return await User.exists({ discordId });
}

// Helper functions for handling preferences

async function setPreferenceKey(model, idKey, idValue, key, value) {
    const query = { [idKey]: idValue };
    const entity = await model.findOne(query);

    if (entity) {
        entity.preferences.set(key, value);
        entity.markModified('preferences');
        await entity.save();
    }

    eventEmitter.emit('updated');
    return entity;
}

async function addToPreferenceKey(model, idKey, idValue, key, value) {
    const query = { [idKey]: idValue };
    const entity = await model.findOne(query);

    if (entity) {
        const preference = entity.preferences.get(key);
        if (preference) {
            if (!preference.includes(value)) {
                preference.push(value);
                entity.preferences.set(key, preference);
            }
        } else {
            entity.preferences.set(key, [value]);
        }

        entity.markModified('preferences');
        await entity.save();
    }

    eventEmitter.emit('updated');
    return entity;
}

async function removeFromPreferenceKey(model, idKey, idValue, key, value) {
    const query = { [idKey]: idValue };
    const entity = await model.findOne(query);

    if (entity) {
        const preference = entity.preferences.get(key);
        if (preference) {
            const index = preference.indexOf(value);
            if (index > -1) {
                preference.splice(index, 1);
                entity.preferences.set(key, preference);
                entity.markModified('preferences');
                await entity.save();
            }
        }
    }

    eventEmitter.emit('updated');
    return entity;
}

// User preference functions

async function setUserPreference(discordId, key, value) {
    const user = await getUserByDiscordId(discordId);
    if (!user) {
        await sendErrorEmbed(interaction, t(l, 'user-not-found'));
        return;
    }

    return await setPreferenceKey(User, 'discordId', discordId, key, value);
}

async function addUserPreference(discordId, key, value) {
    const user = await getUserByDiscordId(discordId);
    if (!user) {
        await sendErrorEmbed(interaction, t(l, 'user-not-found'));
        return;
    }

    return await addToPreferenceKey(User, 'discordId', discordId, key, value);
}

async function removeUserPreference(discordId, key, value) {
    const user = await getUserByDiscordId(discordId);
    if (!user) {
        await sendErrorEmbed(interaction, t(l, 'user-not-found'));
        return;
    }

    return await removeFromPreferenceKey(User, 'discordId', discordId, key, value);
}

// Wrapper functions for VintedChannel preferences

async function setVintedChannelPreference(channelId, key, value) {
    return await setPreferenceKey(VintedChannel, 'channelId', channelId, key, value);
}

async function addVintedChannelPreference(channelId, key, value) {
    return await addToPreferenceKey(VintedChannel, 'channelId', channelId, key, value);
}

async function removeVintedChannelPreference(channelId, key, value) {
    return await removeFromPreferenceKey(VintedChannel, 'channelId', channelId, key, value);
}

async function getVintedChannelPreference(channelId, key) {
    const channel = await getVintedChannelById(channelId);
    if (channel) {
        return channel.preferences.get(key);
    }
}

async function setVintedChannelUpdatedAtNow(channelId) {
    const channel = await getVintedChannelById(channelId);
    if (channel) {
        channel.lastUpdated = new Date();
        await channel.save();
    }
}

async function setVintedChannelBannedKeywords(channelId, bannedKeywords) {
    const channel = await getVintedChannelById(channelId);
    if (channel) {
        channel.bannedKeywords = bannedKeywords;
        await channel.save();
    }
}

async function setVintedChannelKeepMessageSent(channelId, keepMessageSent) {
    const channel = await getVintedChannelById(channelId);
    if (channel) {
        channel.keepMessageSent = keepMessageSent;
        await channel.save();
    }
}
// CRUD Operations for VintedChannel

/**
 * Create a new Vinted channel.
 * @param {Object} channelData - The channel data.
 * @returns {Promise<Object>} - The created channel.
 */
async function createVintedChannel({ channelId, lastUpdated = new Date(), name, url = null, isMonitoring = true, type = 'public', user = null, preferences = {}}) {
    const vintedChannel = new VintedChannel({ channelId, lastUpdated, name, url, isMonitoring, type, user, preferences });
    const result = await vintedChannel.save();
    eventEmitter.emit('updated');
    return result;
}

/**
 * Get a Vinted channel by its ID.
 * @param {string} id - The channel ID.
 * @returns {Promise<Object>} - The channel.
 */
async function getVintedChannelById(id) {
    return await VintedChannel.findOne({ channelId: id }).populate('user');
}

/**
 * Get all Vinted channels.
 * @returns {Promise<Array>} - The list of channels.
 */
async function getAllVintedChannels() {
    return await VintedChannel.find().populate('user');
}

async function getAllPrivateVintedChannels() {
    return await VintedChannel.find({ type: 'private' }).populate('user');
}

function parseVintedSearchParams(url) {
    try {
        const searchParams = {};
        const params = new URL(url).searchParams;
        const paramsKeys = ['search_text', 'order', 'catalog[]', 'brand_ids[]', 'size_ids[]', 'price_from', 'price_to', 'status_ids[]', 'material_ids[]', 'color_ids[]'];
        for (const key of paramsKeys) {
            const isMultiple = key.endsWith('[]');
            if (isMultiple) {
                searchParams[key.replace('[]', '')] = params.getAll(key) || null;
            } else {
                searchParams[key] = params.get(key) || null;
            }
        }
        return searchParams;
    } catch (error) {
        Logger.error("Invalid URL provided: ", error.message);
        return null;
    }
}

async function getAllMonitoredVintedChannels() {
    let channels = await VintedChannel.find({ isMonitoring: true }).populate('user');

    for (const channel of channels) {
        channel.generated_filters = parseVintedSearchParams(channel.url);
    }

    return channels;
}

async function getAllMonitoredVintedChannelsBrandMap() {
    const channels = await getAllMonitoredVintedChannels();
    const brandMap = new Map();

    for (const channel of channels) {
        const brands = channel.generated_filters["brand_ids"]


        for (const brand of brands) {
            
            if (!brandMap.has(brand)) {
                brandMap.set(brand, [channel]);
            } else {
                brandMap.get(brand).push(channel);
            }
        }
    }

    return brandMap;
}

async function getAllVintedChannelsByDiscordId(discordId) {
    const user = await getUserByDiscordId(discordId);
    return await VintedChannel.find({ user: user.discordId }).populate('user');
}

/**
 * Update a Vinted channel.
 * @param {string} id - The channel ID.
 * @param {Object} updateData - The update data.
 * @returns {Promise<Object>} - The updated channel.
 */
async function updateVintedChannel(id, { channelId, lastUpdated, name, url, isMonitoring, type, user }) {
    const update = { channelId, lastUpdated, name, url, isMonitoring, type, user };
    const result = await VintedChannel.findByIdAndUpdate(id, update, { new: true });
    eventEmitter.emit('updated');
    return result;
}

/**
 * Start monitoring a Vinted channel.
 * @param {string} id - The channel ID.
 * @param {string} url - The channel URL.
 * @returns {Promise<Object>} - The updated channel.
 */
async function startVintedChannelMonitoring(id, url) {
    const toUpdate = { isMonitoring: true, url };
    const channel = await VintedChannel.findByIdAndUpdate(id, toUpdate, { new: true });
    eventEmitter.emit('startMonitoring', channel);
    eventEmitter.emit('updated');
    return channel;
}

/**
 * Stop monitoring a Vinted channel.
 * @param {string} id - The channel ID.
 * @returns {Promise<Object>} - The updated channel.
 */
async function stopVintedChannelMonitoring(id) {
    const channel = await VintedChannel.findByIdAndUpdate(id, { isMonitoring: false }, { new: true });
    eventEmitter.emit('stopMonitoring', channel);
    eventEmitter.emit('updated');
    return channel;
}

/**
 * Delete a Vinted channel.
 * @param {string} id - The channel ID.
 * @returns {Promise<Object>} - The deleted channel.
 */
async function deleteVintedChannel(id) {
    const result = await VintedChannel.findByIdAndDelete(id);
    eventEmitter.emit('updated');
    return result;
}

async function deleteVintedChannelByChannelId(channelId) {
    const channel = await VintedChannel.findOne({ channelId: channelId });
    if (channel) {
        return await deleteVintedChannel(channel._id);
    }
}

/**
 * Check if a Vinted channel exists by its ID.
 * @param {string} channelId - The channel ID.
 * @returns {Promise<boolean>} - True if the channel exists, false otherwise.
 */
async function checkVintedChannelExists(channelId) {
    return await VintedChannel.exists({ channelId });
}

// Utility Functions

/**
 * Add a channel to a user's list of channels.
 * @param {string} userId - The user ID.
 * @param {string} channelId - The channel ID.
 */
async function addChannelToUser(userId, channelId) {
    const user = await User.findById(userId);
    if (user) {
        user.channels.push(channelId);
        await user.save();
    }
    eventEmitter.emit('updated');
}

/**
 * Check if a channel is in a user's list of channels.
 * @param {string} userId - The user ID.
 * @param {string} channelId - The channel ID.
 * @returns {Promise<boolean>} - True if the channel is in the user's list, false otherwise.
 */
async function checkChannelInUser(userId, channelId) {
    const user = await User.findById(userId);
    if (user) {
        return user.channels.includes(channelId);
    }
    eventEmitter.emit('updated');
}

/**
 * Remove a channel from a user's list of channels.
 * @param {string} userId - The user ID.
 * @param {string} channelId - The channel ID.
 */
async function removeChannelFromUser(userId, channelId) {
    const user = await User.findById(userId);
    if (user) {
        user.channels.pull(channelId);
        await user.save();
    }
    eventEmitter.emit('updated');
}

async function removeChannelFromUserByIds(discordId, channelId) {
    const user = await getUserByDiscordId(discordId);
    if (user) {
        user.channels.pull(channelId);
        await user.save();
    }
    eventEmitter.emit('updated');
}

async function getUserFromChannel(channelId) {
    const channel = await VintedChannel.findOne({ channelId });
    if (channel) {
        return await getUserById(channel.user);
    }
}

// Export the CRUD operations and utility functions

const crud = {
    createUser,
    isUserAdmin,
    isUserOwnerOfChannel,
    getUserById,
    getUserByDiscordId,
    getUserFromChannel,
    updateUser,
    setUserMaxChannels,
    setVintedChannelUpdatedAtNow,
    setVintedChannelBannedKeywords,
    setVintedChannelKeepMessageSent,
    deleteUser,
    checkUserExists,
    setUserPreference,
    addUserPreference,
    removeUserPreference,
    setVintedChannelPreference,
    addVintedChannelPreference,
    removeVintedChannelPreference,
    getVintedChannelPreference,
    createVintedChannel,
    getVintedChannelById,
    getAllVintedChannels,
    getAllPrivateVintedChannels,
    getAllMonitoredVintedChannels,
    getAllMonitoredVintedChannelsBrandMap,
    getAllVintedChannelsByDiscordId,
    updateVintedChannel,
    deleteVintedChannel,
    deleteVintedChannelByChannelId,
    checkVintedChannelExists,
    addChannelToUser,
    checkChannelInUser,
    removeChannelFromUser,
    removeChannelFromUserByIds,
    startVintedChannelMonitoring,
    stopVintedChannelMonitoring,
    eventEmitter
};

export default crud;
