
import cheerio from 'cheerio';
import { By, until } from 'selenium-webdriver';
import { UrlBuilder } from './url_builder.js';

class VintedHandler {
    constructor(driver) {
        this.driver = driver;
    }

    async getItemsFromUrl(url) {
        try {
            await this.driver.get(url);
            // once find that feed-grid__item is visible, we can start parsing
            // on error, return empty array
            try {
                await this.driver.wait(until.elementLocated(By.className('feed-grid__item')), 10000);
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

        const items = $('[data-testid=grid-item]');

        const parsedItems = [];

        for (let i = 0; i < items.length; i++) {
            const item = items.eq(i);
            const parsedItem = await VintedItem.loadFromItemBoxContainer(item);
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

export { VintedHandler, VintedItem, UrlBuilder };
