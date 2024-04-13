import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

class SeleniumChromeAgent {
    constructor() {
        const options = new chrome.Options();
        // Specify user agent string for a recent version of Chrome
        const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36";

        // Configure Chrome options
        options.addArguments("--headless");
        options.addArguments("--disable-gpu");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments(`--user-agent=${userAgent}`);
        options.addArguments("--disable-web-security");
        options.addArguments("--allow-running-insecure-content");
        options.addArguments("--disable-extensions");
        options.addArguments("--disable-plugins");
        options.addArguments("--disable-popup-blocking");
        options.addArguments("--disable-features=IsolateOrigins,site-per-process");
        options.addArguments("--disable-site-isolation-trials");
        options.addArguments("--ignore-certificate-errors");
        options.addArguments("--ignore-ssl-errors");
        options.addArguments("--ignore-certificate-errors-spki-list");
        options.addArguments("--disable-setuid-sandbox");
        options.addArguments("--disable-infobars");
        options.addArguments("--window-size=1920,1080");
        options.addArguments("--disable-notifications");
        options.addArguments("--disable-background-networking");
        options.addArguments("--disable-breakpad");
        options.addArguments("--disable-component-extensions-with-background-pages");
        options.addArguments("--disable-default-apps"); 
        options.addArguments("--silent");
        options.addArguments("--disable-logging");
        options.addArguments("--disable-sync");

        // Initialize the Chrome driver with these options
        this.driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
    }

    async getDriver() {
        return this.driver;
    }

    async close() {
        await this.driver.quit();
    }
}

export { SeleniumChromeAgent };