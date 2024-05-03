import { SocksProxyAgent } from 'socks-proxy-agent';

class ProxyConfig {
    constructor(host, port, username, password, protocol) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.protocol = protocol;
    }

    toString() {
        return `${this.protocol}://${this.username}:${this.password}@${this.host}:${this.port}`;
    }

    getProxyAgent() {

        // Determine if it's a SOCKS proxy and create the appropriate agent
        if (this.protocol.startsWith('socks')) {
            return new SocksProxyAgent("socks://" + this.username + ":" + this.password + "@" + this.host + ":" + this.port);
        } else {
            // For HTTP/HTTPS proxies, you can adjust accordingly
            return `http://${this.username}:${this.password}@${this.host}:${this.port}`;
        }
    }
}

export { ProxyConfig }