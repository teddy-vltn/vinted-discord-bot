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

export async function listProxies( apiKey ) {
    if (!apiKey) {
        throw new Error("API key is required.")
    }

    const url = new URL('https://proxy.webshare.io/api/v2/proxy/list/')
          url.searchParams.append('mode', 'direct')
          url.searchParams.append('page_size', '9999')
   
    const req = await fetch(url.href, {
      method: "GET",
      headers: {
        Authorization: "Token " + apiKey
      }
    })
   
    const res = await req.json()

    const proxies = res.results.map(proxy => 
        new Proxy(proxy.proxy_address, proxy.port, proxy.username, proxy.password)
    )

    return proxies
}
