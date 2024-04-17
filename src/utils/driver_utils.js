

class DriverUtils {

    /**
     * Wait for an element to be located in the DOM.
     * @param {object} driver - The Selenium WebDriver instance to use.
     * @param {object} selector - The selector object to locate the element.
     * @param {number} timeout - The maximum time to wait for the element in milliseconds.
     * @returns {object} The located element.
     */
    static async wait_for_element(driver, selector, timeout = 10000) {
        // Promise to wait for the element to be located.
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout waiting for element with selector: ${selector}`));
            }, timeout);

            // Check for the element at regular intervals.
            const checkInterval = setInterval(async () => {
                try {
                    const element = await driver.findElement(selector);
                    if (element) {
                        clearInterval(checkInterval);
                        clearTimeout(timeoutId);
                        resolve(element);
                    }
                } catch (err) {
                    // Element not found yet, continue waiting.
                }
            }, 1000);
        });
    }

    /**
     * Checks and handles cookie consent forms by attempting to find and click a "reject all" button.
     */
    static async checkForCookieConsent(driver) {
        try {
            const rejectButton = await driver.findElement(By.id('onetrust-reject-all-handler'));
            if (rejectButton) {
                await rejectButton.click();
                console.log('Cookie consent rejected.');
            }
        } catch (err) {
            console.log('No cookie consent found or error in rejecting cookies:', err.message);
        }
    }
}

export default DriverUtils;