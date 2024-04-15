

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
    constructor(ip, port, username, password) {
        this.ip = ip;
        this.port = port;
        this.username = username;
        this.password = password;
    }
}

export { Proxys, ProxyEntity };