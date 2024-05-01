class ProxyHandler {
    constructor(proxies) {
        this.proxies = proxies;   // Array of ProxyConfig instances
        this.currentProxyIndex = 0;
    }

    getNextProxy() {
        if (this.proxies.length === 0) {
            throw new Error("No proxies available.");
        }

        const proxy = this.proxies[this.currentProxyIndex];
        // Move to the next proxy in the list, wrap around if at the end
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        return proxy;
    }

    getProxies() {
        return this.proxies;
    }
}

export default ProxyHandler;
