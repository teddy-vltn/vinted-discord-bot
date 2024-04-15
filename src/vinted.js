
import cheerio from 'cheerio';
import { By, until } from 'selenium-webdriver';
import { UrlBuilder } from './url_builder.js';
import cookie from 'cookie';
import { HttpsProxyAgent } from 'https-proxy-agent';

class VintedHandlerSelenium {
    constructor(driver) {
        this.driver = driver;
    }

    async getItemsFromUrl(url) {
        try {
            this.driver.get(url);
            
            // once find that feed-grid__item is visible, we can start parsing
            // on error, return empty array
            try {
                await this.driver.wait(until.elementLocated(By.className('feed-grid__item')), 30000);
            } catch (error) {
                console.error("No items has been found after waiting.", error);
                return [];
            }
            
            const feed_grid = await this.driver.findElement(By.className('feed-grid'));

            const items = await this.parseItems(await feed_grid.getAttribute('innerHTML'));

            return items;
        } catch (error) {
            console.error("Error fetching or parsing items: ", error);
            return [];
        }
    }

    async parseItems(data) {

        const $ = cheerio.load(data);

        // skip feed-grid__item feed-grid__item--full-row which are sponsored items

        const items = $('.feed-grid__item').not('.feed-grid__item--full-row');

        const parsedItems = [];

        for (let i = 0; i < items.length; i++) {
            const item = items.eq(i);
            const parsedItem = await VintedItem.loadFromItemBoxContainer(item);
            parsedItems.push(parsedItem);
        }

        return parsedItems;
    }

}

class VintedHandlerAPI {
    constructor() {
        this.cookie = null;
    }

    useProxy(proxy) {
        this.proxy = proxy;
    }

    async fetchCookie(domain = 'fr', agent = null) {
        console.log(`Fetching cookie for domain https://www.vinted.${domain}`);
        const response = await fetch(`https://www.vinted.${domain}`, {
            agent: agent
        });
        
        let vintedCookies = response.headers.get('set-cookie');

        if (!vintedCookies) {
            console.error("No cookies found in response.");
            return;
        }

        let vintedCookie = cookie.parse(vintedCookies)["SameSite"].replace(`Lax, _vinted_${domain}_session=`, "")

        this.cookie = vintedCookie;
    }

    async getItemsFromUrl(url) {
        // _vinted_fr_session can be any instead of "fr" for example if on vinted.lt it will be _vinted_lt_session
        // parse based on url domain instead of hardcoding
        const domain = new URL(url).hostname.split('.').slice(-2)[1];

        let agent = null;

        if (this.proxy) {
            console.log(`Using proxy ${this.proxy}`);
            agent = new HttpsProxyAgent(this.proxy.toString());
        }

        if (!this.cookie) {
            await this.fetchCookie(domain, agent);
        }

        const response = await fetch(url, {
            headers: {
                cookie: `_vinted_${domain}_session=${this.cookie}`
            },
            agent: agent
        });

        const data = await response.text();

        const items = this.parseItems(data);

        return items;
    }   

    parseItems(data) {
        const items = JSON.parse(data).items
        const parsedItems = [];

        for (let item of items) {
            const parsedItem = new VintedItem(
                item.price,
                null,
                item.url,
                item.photo.url,
                item.user.login,
                item.user.id,
                item.title,
                item.brand_title
            );

            parsedItems.push(parsedItem);
        }

        return parsedItems;
    }

}

class VintedItem {
    constructor(price, size, url, imageUrl, owner, ownerId, desc = null, brand = null) {
        this.brand = brand;
        this.price = price;
        this.size = size;
        this.url = url;
        this.imageUrl = imageUrl;
        this.owner = owner;
        this.ownerId = ownerId;
        this.desc = desc;
    }

    static async loadFromItemBoxContainer(item) {
        const owner = item.find('[data-testid$=--owner-name]').text();
        const ownerId = item.find('[data-testid$=--owner]').text();
        const price = item.find('[data-testid$=--price-text]').text();
        const size = item.find('[data-testid$=--description-title]').text();
        const brand = item.find('[data-testid$=--description-subtitle]').text();
        const url = item.find('[data-testid$=--overlay-link]').attr('href');
        const imageUrl = item.find('[data-testid$=--image--img]').attr('src');

        return new VintedItem(price, size, url, imageUrl, owner, ownerId, null, brand);
    }

    toString() {
        return [
            `Owner: ${this.owner}`,
            `Owner ID: ${this.ownerId}`,
            this.brand ? `Brand: ${this.brand}` : '',
            this.desc ? `Description: ${this.desc}` : '',
            this.size ? `Size: ${this.size}` : '',
            this.price ? `Price: ${this.price}` : '',
            `Image URL: ${this.imageUrl}`,
            `URL: ${this.url}`
        ]
    }
}

export { VintedHandlerSelenium, VintedHandlerAPI, VintedItem, UrlBuilder };
