
import cheerio from 'cheerio';
import { By, until } from 'selenium-webdriver';
import { UrlBuilder } from '../utils/url_builder.js';
import cookie from 'cookie';
import request from 'request';
import DriverUtils from '../utils/driver_utils.js';


class VintedHandlerSelenium {
    constructor(driver) {
        this.driver = driver;
    }

    async getItemsFromUrl(url) {
        try {
            await this.driver.get(url);
            
            // Wait for the element to be visible
            await DriverUtils.wait_for_element(this.driver, By.className('feed-grid__item'), 10000);
            
            const feed_grid = await this.driver.findElement(By.className('feed-grid'));
            const innerHTML = await feed_grid.getAttribute('innerHTML');
            const items = await this.parseItems(innerHTML);
            
            return items;
        } catch (error) {
            console.error('Error waiting for feed grid items:', error);
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

const baseOptions = {
    method: "GET",
    headers: {
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
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

        let options = baseOptions;
        options['url'] = `https://www.vinted.com`;
            
        if (this.proxy) {
            options['agent'] = this.proxy.getAgent();
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

            let options = baseOptions;
            options['url'] = url;
            options['headers']['Cookie'] = `_vinted_fr_session=${this.cookie}`;

            if (this.proxy) {
                options['agent'] = this.proxy.getAgent();
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
            const parsedItem = new VintedItem(item.title, item.price, item.size_title, item.url, item.photo.url, item.profile_url, item.brand_title);

            parsedItems.push(parsedItem);
        }

        return parsedItems;
    }

}

class VintedItem {
    constructor(title, price, size, url, imageUrl, profileUrl, brand = null) {
        this.title = title;
        this.brand = brand;
        this.price = price;
        this.size = size;
        this.url = url;
        this.imageUrl = imageUrl;
        this.profileUrl = profileUrl;
    }

    static async loadFromItemBoxContainer(item) {
        const title = item.find('[data-testid$=--title]').text();
        //const ownerId = item.find('[data-testid$=--owner]').text();
        const price = item.find('[data-testid$=--price-text]').text();
        const size = item.find('[data-testid$=--description-title]').text();
        const brand = item.find('[data-testid$=--description-subtitle]').text();
        const url = item.find('[data-testid$=--overlay-link]').attr('href');
        const imageUrl = item.find('[data-testid$=--image--img]').attr('src');

        return new VintedItem(title, price, size, url, imageUrl, null, brand);
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
