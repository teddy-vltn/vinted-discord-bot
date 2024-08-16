import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Check if .env.local exists and load environment variables from it, overriding the default .env values
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
}

/**
 * Static class to manage application configurations.
 */
class ConfigurationManager {
    /**
     * Retrieves the Discord configuration section from environment variables.
     * @returns {Object} Discord configuration object.
     */
    static getDiscordConfig = {
        client_id: process.env.DISCORD_CLIENT_ID,
        token: process.env.DISCORD_TOKEN,
        admin_id: process.env.DISCORD_ADMIN_ID
    }
    
    /**
     * Retrieves the MongoDB configuration section from environment variables.
     * @returns {Object} MongoDB configuration object.
     */
    static getMongoDBConfig = {
        uri: process.env.MONGODB_URI
    }
    
    /**
     * Retrieves the user configuration from environment variables.
     * @returns {Object} User configuration object.
     */
    static getUserConfig = {
        max_private_channels_default: process.env.USER_MAX_PRIVATE_CHANNELS_DEFAULT
    }

    static getPermissionConfig = {
        allow_user_to_create_private_channels: process.env.ALLOW_USER_TO_CREATE_PRIVATE_CHANNELS == 1 ? true : false
    }

    /**
     * Retrieves the algorithm settings from environment variables.
     * @returns {Object} Algorithm settings object.
     */
    static getAlgorithmSetting = {
        vinted_api_domain_extension: process.env.VINTED_API_DOMAIN_EXTENSION,
        filter_zero_stars_profiles: process.env.ALGORITHM_FILTER_ZERO_STARS_PROFILES == 1 ? true : false,
        concurrent_requests: process.env.ALGORITHM_CONCURRENT_REQUESTS,
        blacklisted_countries_codes : process.env.BLACKLISTED_COUNTRIES_CODES.split(',') || []
    }

    /**
     * Retrieves the rotating proxy configuration from environment variables.
     * @returns {Array} Array of proxy configurations.
     */
    static getProxiesConfig = {
        use_webshare: process.env.USE_WEBSHARE == 1 ? true : false,
        webshare_api_key: process.env.WEBSHARE_API_KEY,
    }

    static getDevMode = process.env.DEV_MODE == 1 ? true : false;
}

export default ConfigurationManager;
