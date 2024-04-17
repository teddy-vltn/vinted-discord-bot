import { ProxyHandler } from "../src/utils/proxys.js"
import request from "request";
import { config } from "dotenv";

// Load environment variables
config();
config({ path: `.env.local`, override: true });

// Get environment variables
const env = process.env;

console.log("Proxy IP:", env.PROXY_IP);

// Proxy configuration
const proxy = new ProxyHandler(env.PROXY_PROTOCOL, env.PROXY_IP, env.PROXY_PORT, env.PROXY_USERNAME, env.PROXY_PASSWORD);

// Test the proxy
request({
    url: "https://api.ipify.org?format=json",
    agent: proxy.getAgent()
}, (error, response, body) => {
    if (error) {
        console.error("Error fetching IP:", error);
        return;
    }

    console.log("IP:", JSON.parse(body).ip);
});

