# VintedMonitor - Monitor Vinted for New Listings

## Overview
`VintedMonitor` is a sophisticated tool designed to monitor Vinted for new listings. It can utilize both Selenium for web scraping and direct API calls to Vinted, depending on your setup preferences. This flexibility allows users to adapt to potential changes in Vinted's website or API. Additionally, the tool integrates with Telegram to provide real-time alerts on new listings based on user-defined preferences such as brands, sizes, catalog, and price range.

## Features
- **Real-Time Alerts:** Get instant notifications via Telegram when new items that match your preferences are listed.
- **Customizable Tracking:** Track items by brand, size, price range, and more.
- **Support for Proxies:** Use proxies to manage IP restrictions or blockages.
- **Selenium and API Support:** Choose between scraping the website with Selenium or using Vinted's API for data retrieval.

## Left to do

- [ ] Add more feature + more configuration to the telegram bot.
- [ ] Simple database to store the users preferences.
- [ ] Add a language option for the dataset. Currently, it only supports French dataset.
- [ ] Add more features to the monitor.
- [ ] Export the telegram bot to a discord bot.

## Data

The overall vinted database has been roughly collected from the Vinted website and stored in JSON files in the `data` directory. 

Last updated: `16th April 2024`

## Getting Started
---------------

### Installation

Ensure that you have the required packages installed. If not, you can install them using npm:

```bash
npm install
```

### Running the Monitor

To run the monitor and test the main.js file, use the following command:

```bash
npm run start
```

You also have a way to run the monitor in a telegram bot using the following command:

```bash
npm run telegram
```

If you want to know about how to create a Telegram Bot : https://core.telegram.org/bots/tutorial
Follow this tutorial to create your own bot and set your token in `config.json` file.

The base code for the telegram bot is in `telegram.js` file. It holds features like:
*   `/start` : To start the bot
*   `/config` : To see the current config
*   `/setbrands` : To set the brands. eg: `/setbrands Nike, Puma`
*   `/setsizes` : To set the sizes. eg: `/setsizes XS, S`
*   `/setprice` : To set the price range. eg: `/setprice 10-100`
*   `/watch` : To start watching the items.
*   `/stop` : To stop watching the items.

<p float="left">
    <img src="img/telegram.jpeg" width="200" />
</p>

### Files

- `vinted_monitor.js`: Contains the `VintedMonitor` class responsible for setting up and managing item monitoring on Vinted.

Usage
-----

To use the `VintedMonitor`, import it into your project and configure it with desired parameters:

### Simple Setup Example

Here's a basic example of how to set up and use the `VintedMonitor`:

```javascript
import { VintedMonitor } from './src/vinted_monitor.js';
import { ProxyEntity } from './src/proxys.js';

/**
 * This script initializes a VintedMonitor to track new listings on Vinted.
 * It supports both Selenium-based scraping and Vinted's API usage.
 */

async function main() {
    // Initialize VintedMonitor with the specific Vinted domain you want to track.
    const vintedMonitor = new VintedMonitor('https://www.vinted.fr');

    // Optionally, enable Selenium scraping; set to false to use Vinted's API.
    vintedMonitor.useSelenium(true);

    // Configure a proxy if running from a location with IP restrictions.
    // WARNING: Use reliable proxies to avoid security risks and ensure data integrity.
    // vintedMonitor.useProxy(new ProxyEntity("128.199.221.91", "61449", "http"));

    // Set up monitoring configuration.
    await vintedMonitor.configure({
        search_text: 'veste',
        order: 'newest_first',  // Ensures that the monitor fetches the newest items available.
        brands: ['Nike', 'Adidas'],  // Specify brands to monitor.
        catalog: "T-shirt Hommes",  // Specify the catalog name; the system will find the closest match.
        sizes: ['XS', 'S'],  // Specify sizes to monitor.
        priceFrom: 10,  // Set minimum price filter.
        priceTo: 100  // Set maximum price filter.
    });

    // Start monitoring. The provided callback handles new item alerts.
    vintedMonitor.startMonitoring(newItems => {
        console.log(`Found ${newItems.length} new items:`);
        /*
            You can customize the output based on your needs.

            You can use:
            - item.brand
            - item.price
            - item.size
            - item.url
            - item.imageUrl
            - item.owner
            - item.ownerId
            - item.desc
        */

        // Example using everything available.
        newItems.forEach(item => {
            const message = `New item found:\nBrand: ${item.brand}\nPrice: ${item.price}\nSize: ${item.size}\nURL: ${item.url}\nImage: ${item.imageUrl}\nOwner: ${item.owner}\nOwner ID: ${item.ownerId}\nDescription: ${item.desc}`;
            const separator = '-'.repeat(30);
            console.log(message);
            console.log(separator);
        });

     }, 5000);  // Monitoring interval set to every 5 seconds.

    // Optionally, stop monitoring after a specified time.
    setTimeout(() => {
        vintedMonitor.stopMonitoring();
        console.log("Monitoring has been stopped.");
    }, 3600000); // Stops after 1 hour.
}

main();
```

### Configuration Options

*   `useSelenium`: Boolean value to enable Selenium scraping.
*   `useProxy`: ProxyEntity object to set up a proxy for the monitor.

*   `search_text`: Text to search for in the Vinted website.
*   `order`: Sort order of the items.
*   `catalog`: Specific catalog to monitor.
All the catalog options can be found in the `data/groups.json` file.
*   `brands`: Array of brands to filter items.
All the brands options can be found in the `data/brands.json` file.
*   `sizes`: Sizes to filter the items.
All the sizes options can be found in the `data/sizes.json` file.
*   `priceFrom`: Minimum price of items to monitor.
*   `priceTo`: Maximum price of items to monitor.

It uses `fuse.js` to search for the closest match to the provided values. So, if you provide a brand that is not in the list, it will still try to find the closest match. So no need to write the exact brand name or size or catalog name.

## Features
--------

*   **Real-time Monitoring**: Checks Vinted for new listings at specified intervals.
*   **Flexible Configuration**: Easy to specify what items to watch through simple configuration.
*   **Callback Functionality**: Provides real-time callbacks for new items found.

### Stopping the Monitor
--------------------

To stop the monitor after a certain period or based on specific conditions, use the `stopMonitoring` method.

## Contributions
-------------

Contributions are welcome. Please submit a pull request or issue on our GitHub repository.

## Troubleshooting

If you encounter any issues, please check the following:
*   Ensure that you have the required packages installed.
*   If it is selenium related: https://stackoverflow.com/questions/26191142/selenium-nodejs-chromedriver-path
*   If it is related to the Vinted website structure, please wait for an update or submit an issue.