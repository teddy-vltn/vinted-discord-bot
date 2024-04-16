

class Proxys {
    constructor() {
        this.proxys = [];
    }

    add(proxy) {
        this.proxys.push(proxy);
    }

    get() {
        return this.proxys;
    }
}

class ProxyEntity {
    constructor(ip, port, protocol, username, password) {
        this.ip = ip;
        this.port = port;
        this.protocol = protocol;
        this.username = username;
        this.password = password;
    }

    toString() {
        return `${this.protocol}://${this.ip}:${this.port}`;
    }
}

export { Proxys, ProxyEntity };