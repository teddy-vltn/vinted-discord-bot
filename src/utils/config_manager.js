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
    static getDiscordConfig() {
        return {
            client_id: process.env.DISCORD_CLIENT_ID,
            token: process.env.DISCORD_TOKEN,
            admin_id: process.env.DISCORD_ADMIN_ID
        };
    }
    
    /**
     * Retrieves the MongoDB configuration section from environment variables.
     * @returns {Object} MongoDB configuration object.
     */
    static getMongoDBConfig() {
        return {
            uri: process.env.MONGODB_URI
        };
    }

    /**
     * Retrieves the user configuration from environment variables.
     * @returns {Object} User configuration object.
     */
    static getUserConfig() {
        return {
            max_private_channels_default: process.env.USER_MAX_PRIVATE_CHANNELS_DEFAULT
        };
    }

    /**
     * Retrieves the algorithm settings from environment variables.
     * @returns {Object} Algorithm settings object.
     */
    static getAlgorithmSettings() {
        return {
            concurrent_requests: process.env.ALGORITHM_CONCURRENT_REQUESTS
        };
    }

    /**
     * Retrieves the rotating proxy configuration from environment variables.
     * @returns {Array} Array of proxy configurations.
     */
    static getRotatingProxyConfig() {
        return {
                host: process.env.PROXY_HOST,
                port: process.env.PROXY_PORT,
                username: process.env.PROXY_USERNAME,
                password: process.env.PROXY_PASSWORD
            }
    }
}

export default ConfigurationManager;
