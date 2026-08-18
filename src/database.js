import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

import ConfigurationManager from "./utils/config_manager.js";

const mongoConfig = ConfigurationManager.getMongoDBConfig

import Logger from "./utils/logger.js";

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

const ShippableMap = {
    "pl": ["se", "lt", "sk", "hu", "ro", "cz", "dk", "hr", "fi"],
    "fr": ["nl", "be", "it", "es", "pt", "lu", "at"],
    "it": ["nl", "be", "fr", "es", "pt", "lu", "at"],
    "be": ["nl", "fr", "it", "es", "pt", "lu"],
    "es": ["nl", "be", "fr", "it", "pt", "lu"],
    "nl": ["be", "fr", "it", "es", "pt", "lu"],
    "pt": ["nl", "be", "fr", "it", "es"],
    "lu": ["nl", "be", "fr", "it", "es"],
    "fi": ["se", "dk", "lt", "pl"],
    "dk": ["se", "fi", "pl"],
    "se": ["fi", "dk", "pl"],
    "at": ["fr", "it"],
    "cz": ["sk", "pl"],
    "lt": ["fi", "pl"],
    "sk": ["cz", "pl"],
    "hr": ["pl"],
    "ro": ["pl", "gr"],
    "hu": ["pl"],
    "gr": ["ro"],
    "com": ["us"],
    "de": [],
    "uk": [],
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
    keepMessageSent: { type: Boolean, default: false },
    name: { type: String, required: false },
    url: { type: String, default: null },
    bannedKeywords: { type: [String], default: [] },
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

export { Preference, ShippableMap, User, VintedChannel };
