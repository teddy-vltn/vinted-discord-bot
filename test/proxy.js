
const PROXY = "157.254.28.10:999"
import { Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

async function start() {
    const options = new chrome.Options()

    options.addArguments('--proxy-server=' + PROXY)

    const driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build()

    await driver.get('http://example.com')
    const title = await driver.getTitle()
    console.log(title)

}

start()

