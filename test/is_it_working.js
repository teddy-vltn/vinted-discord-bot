import { Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

async function start() {
    const options = new chrome.Options()

    options.addArguments('--disable-dev-shm-usage')
    options.addArguments('--no-sandbox')
    options.addArguments('--headless')

    const driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build()

    await driver.get('https://google.com')
    await driver.sleep(1000)
    const text = await driver.executeScript('return document.documentElement.innerText')
    console.log(text)
    driver.quit()
}

start()