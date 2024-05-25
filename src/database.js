import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

import ConfigurationManager from "./utils/config_manager.js";

const mongoConfig = ConfigurationManager.getMongoDBConfig();

import fs from 'fs';
import path from 'path';
import Logger from "./utils/logger.js";

const __dirname = path.resolve();

// Load and parse the JSON file
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/groups.json')));

const categoryMap = {};

// Helper function to recursively build the catalog map
function buildCategoryMap(node, parentMap = {}) {
    if (node.id) {
        const nodeId = String(node.id);
        parentMap[nodeId] = parentMap[nodeId] || [];
        parentMap[nodeId].push(nodeId); // Include the current node ID in its own list of children
    }
    if (node.children) {
        for (const key in node.children) {
            const child = node.children[key];
            const childId = String(child.id);
            const parentId = String(node.id);
            buildCategoryMap(child, parentMap);
            parentMap[parentId] = parentMap[parentId].concat(parentMap[childId] || []);
        }
    }
    return parentMap;
}
// Build the category map starting from the root nodes
for (const key in data) {
    buildCategoryMap(data[key], categoryMap);
}

function isSubcategory(parentId, childId) {
    parentId = String(parentId);
    childId = String(childId);
    return categoryMap[parentId].includes(childId);
}

// Connect to MongoDB
mongoose.connect(mongoConfig.uri)
    .then(() => Logger.info("Connected to MongoDB."))
    .catch((err) => Logger.error(err));

    // const preferencesEnum
const Preference = {
    Countries: "countries",
    Language: "language",
    Currency: "currency",
    Mention: "mention"
};

// Define your schemas
const userSchema = new Schema({
    discordId: { type: String, unique: true, required: true },
    channels: [{ type: Types.ObjectId, ref: 'VintedChannel' }],
    lastUpdated: { type: Date, default: Date.now },
    maxChannels: { type: Number, default: ConfigurationManager.getUserConfig.max_private_channels_default },
    preferences: { type: Map, default: {} },
});

/*const groupSchema = new Schema({
    name: { type: String, unique: true, required: true },
    users: [{ type: Types.ObjectId, ref: 'User' }],
});*/

const vintedChannelSchema = new Schema({
    channelId: { type: String, unique: true, required: true },
    lastUpdated: { type: Date, default: Date.now },
    name: { type: String, required: true },
    url: { type: String, default: null },
    isMonitoring: { type: Boolean, default: true },
    type: { type: String, default: 'public' },
    user: { type: Types.ObjectId, ref: 'User', default: null },
    preferences: { type: Map, default: {} },
});

// Create models
//const Group = model('Group', groupSchema);
const User = model('User', userSchema);
const VintedChannel = model('VintedChannel', vintedChannelSchema);

Logger.info("Database models loaded.");

export { Preference, User, VintedChannel, isSubcategory };
