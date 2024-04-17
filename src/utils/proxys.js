// SocksAgent

import { SocksProxyAgent } from 'socks-proxy-agent';

class ProxyConfig {
    constructor(proxyType, proxyAutoconfigUrl, ftpProxy, httpProxy, sslProxy, noProxy, socksProxy, socksUsername, socksPassword) {
        this.proxyType = proxyType;
        this.proxyAutoconfigUrl = proxyAutoconfigUrl;
        this.ftpProxy = ftpProxy;
        this.httpProxy = httpProxy;
        this.sslProxy = sslProxy;
        this.noProxy = noProxy;
        this.socksProxy = socksProxy;
        this.socksUsername = socksUsername;
        this.socksPassword = socksPassword;
    }
}

class SocksAgent {
    constructor(ip, port, username, password) {
        if (!ip || !port) {
            throw new Error("IP and port are required for a proxy.");
        }

        if (username && password) {
            this.url = `socks://${username}:${password}@${ip}:${port}`;
            this.config = new ProxyConfig('manual', undefined, undefined, undefined, undefined, undefined, `socks://${ip}:${port}`, username, password);
            this.agent = new SocksProxyAgent(`socks://${username}:${password}@${ip}:${port}`);
            return;
        }

        this.url = `socks://${ip}:${port}`;
        this.agent = new SocksProxyAgent(`socks://${ip}:${port}`);
    }

    getAgent() {
        return this.agent;
    }

    getURL() {
        return this.url;
    }

    getConfig() {
        return this.config;
    }

}

class HTTPAgent {
    constructor(ip, port, username, password) {
        if (!ip || !port) {
            throw new Error("IP and port are required for a proxy.");
        }

        if (username && password) {
            this.config = new ProxyConfig('manual', undefined, undefined, `http://${username}:${password}@${ip}:${port}`, `http://${username}:${password}@${ip}:${port}`, undefined, undefined, undefined, undefined);
            this.agent = `http://${username}:${password}@${ip}:${port}`;
            return;
        }

        this.config = new ProxyConfig('manual', undefined, undefined, `http://${ip}:${port}`, `http://${ip}:${port}`, undefined, undefined, undefined, undefined);
        this.agent = `http://${ip}:${port}`;
    }

    getAgent() {
        return this.agent;
    }

    getURL() {
        return this.agent;
    }

    getConfig() {
        return this.config;
    }
}

class ProxyHandler {
    constructor(protocol, ip, port, username, password) {

        if (protocol === 'socks') {
            this.proxy = new SocksAgent(ip, port, username, password);
            return;
        }

        if (protocol === 'http') {
            this.proxy = new HTTPAgent(ip, port, username, password);
            return;
        }

        throw new Error("Unsupported proxy protocol.");

    }

    getProxy() {
        return this.proxy;
    }

    getAgent() {
        return this.proxy.getAgent();
    }

    getURL() {
        return this.proxy.getURL();
    }

    getConfig() {
        return this.proxy.getConfig();
    }

}

export { ProxyHandler };