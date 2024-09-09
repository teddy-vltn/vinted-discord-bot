export class Proxy {
    constructor(ip, port, username, password) {
        this.ip = ip;
        this.port = port;
        this.username = username;
        this.password = password;
        this.method = "socks"
    }

    getProxyString() {
        return `${this.method}://${this.username}:${this.password}@${this.ip}:${this.port}`
    }

}

export async function listProxies(apiKey, timeout = 10000) {
    if (!apiKey) {
        throw new Error("API key is required.");
    }

    const baseUrl = 'https://proxy.webshare.io/api/v2/proxy/list/';
    let allProxies = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        const url = new URL(baseUrl);
        url.searchParams.append('mode', 'direct');
        url.searchParams.append('page_size', '100');
        url.searchParams.append('page', page);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const req = await fetch(url.href, {
                method: "GET",
                headers: {
                    Authorization: "Token " + apiKey,
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!req.ok) {
                throw new Error(`HTTP error! status: ${req.status}`);
            }

            const res = await req.json();

            const proxies = res.results.map((proxy) =>
                new Proxy(proxy.proxy_address, proxy.port, proxy.username, proxy.password)
            );

            allProxies = allProxies.concat(proxies);

            totalPages = Math.ceil(res.count / 100);
            page++;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error;
        }
    }

    return allProxies;
}
