import fs from 'fs';
import yaml from 'js-yaml';
import { ProxyConfig } from '../entities/proxy_config.js';

class ConfigurationManager {
    constructor(baseConfigPath) {
        this.baseConfigPath = baseConfigPath;
        this.localConfigPath = baseConfigPath.replace(/\.yaml$/, '.local.yaml');
        this.config = this.loadConfig();
    }

    loadConfig() {
        let config = {};
        // Load the base configuration file
        if (fs.existsSync(this.baseConfigPath)) {
            config = yaml.load(fs.readFileSync(this.baseConfigPath, 'utf8'));
        }

        // Check if the local configuration file exists and merge it
        if (fs.existsSync(this.localConfigPath)) {
            const localConfig = yaml.load(fs.readFileSync(this.localConfigPath, 'utf8'));
            config = localConfig
        }

        return config;
    }

    isProxyEnabled() {
        return this.config.use_proxies;
    }

    getTelegramToken() {
        return this.config.telegram.token;
    }

    getProxies() {
        if (!this.isProxyEnabled()) {
            return [];
        }

        // return array of ProxyConfig instances
        return this.config.proxies.map(proxy => new ProxyConfig(proxy.host, proxy.port, proxy.username, proxy.password, proxy.type));
    }

    getInterval() {
        return this.config.interval * 1000;
    }

}

export default ConfigurationManager;

