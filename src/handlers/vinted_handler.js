
import cheerio from 'cheerio';
import { By, until } from 'selenium-webdriver';
import { UrlBuilder } from '../utils/url_builder.js';
import cookie from 'cookie';
import request from 'request';

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

    /*request({
  'url':'https://anysite.you.want/sub/sub',
  'method': "GET",
  'proxy':'http://yourproxy:8087'
},function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body);
  }
})*/

    async fetchCookie(domain = 'fr') {

        let options = {
            url: `https://www.vinted.${domain}`,
            method: "GET"
        };

        if (this.proxy) {
            options['proxy'] = this.proxy.toString();
        }
    
        return new Promise((resolve, reject) => {
            console.log(`Fetching cookie for domain https://www.vinted.${domain}`);
            
            request(options, (error, response, body) => {
                if (error) {
                    console.error("Error fetching cookie:", error);
                    reject("Failed to fetch cookie: " + error.message);
                    return;
                }
                
                if (response && response.headers['set-cookie']) {
                    let vintedCookies = response.headers['set-cookie'].join(";");
                    try {
                        let parsedCookies = cookie.parse(vintedCookies);
                        let sessionCookieKey = `_vinted_fr_session`;
                        let sessionCookie = parsedCookies[sessionCookieKey];
                        if (sessionCookie) {
                            this.cookie = sessionCookie.split(';')[0];
                            console.log("Cookie fetched successfully");
                            resolve(this.cookie);
                        } else {
                            reject("Session cookie not found in response.");
                        }
                    } catch (parseError) {
                        reject("Error parsing cookies: " + parseError.message);
                    }
                } else {
                    console.error("No cookies found in response.");
                    reject("No cookies found in response.");
                }
            });
        });
    }

    async getItemsFromUrl(url) {
        const domain = new URL(url).hostname.split('.').slice(-2)[1]; 

        if (!this.cookie) {
            await this.fetchCookie(domain);
        }

        return new Promise((resolve, reject) => {
            let options = {
                url: url,
                headers: {
                    'Cookie': `_vinted_fr_session=${this.cookie}`
                }
            };

            if (this.proxy) {
                console.log(`Using proxy ${this.proxy}`);
                options['proxy'] = this.proxy;
            }

            request(options, (error, response, body) => {
                if (error) {
                    console.error("Error fetching items:", error);
                    reject(error);
                    return;
                }

                try {
                    const items = this.parseItems(body);
                    resolve(items);
                } catch (parseError) {
                    console.error("Error parsing items:", parseError);
                    reject(parseError);
                }
            });
        });
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
    constructor(price, size, url, imageUrl, owner, ownerId, brand = null) {
        this.brand = brand;
        this.price = price;
        this.size = size;
        this.url = url;
        this.imageUrl = imageUrl;
        this.owner = owner;
        this.ownerId = ownerId;
        this.desc = null;
        this.rating = null;
        this.votes = null;
    }

    static async loadFromItemBoxContainer(item) {
        const owner = item.find('[data-testid$=--owner-name]').text();
        const ownerId = item.find('[data-testid$=--owner]').text();
        const price = item.find('[data-testid$=--price-text]').text();
        const size = item.find('[data-testid$=--description-title]').text();
        const brand = item.find('[data-testid$=--description-subtitle]').text();
        const url = item.find('[data-testid$=--overlay-link]').attr('href');
        const imageUrl = item.find('[data-testid$=--image--img]').attr('src');

        return new VintedItem(price, size, url, imageUrl, owner, ownerId, brand);
    }

    // <div class="u-text-wrap" itemprop="description"><span class="web_ui__Text__text web_ui__Text__body web_ui__Text__left web_ui__Text__format"><span>Acheté mais ne me plaît pas donc jamais porté</span></span></div>
    async getMoreInfo(driver) {
        if (!driver) throw new Error('Driver must be provided to get more info');
    
        await driver.get(this.url);
        await driver.wait(until.elementLocated(By.tagName('body')), 10000);
    
        const html = await driver.getPageSource();
    
        const $ = cheerio.load(html);
    
        // Extraction de la description
        const desc = $('[itemprop="description"]').text().trim();
    
        // Extraction de la note moyenne (rating)
        const ratingLabel = $('.web_ui__Rating__rating[aria-label]').attr('aria-label');
        const ratingValue = ratingLabel ? parseFloat(ratingLabel.match(/(\d+(\.\d+)?)/)[0]) : null;
    
        // Extraction du nombre de votes
        const votesText = $('.web_ui__Rating__label h4').text();
        const votes = parseInt(votesText, 10);
    
        // Stocker les informations extraites dans l'objet
        this.desc = desc;
        this.rating = ratingValue;
        this.votes = votes;
    
        return this;
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
