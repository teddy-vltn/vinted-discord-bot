import { SeleniumChromeAgent } from '../agents/selenium_agent.js';
import { By, until } from 'selenium-webdriver';
import cheerio from 'cheerio';
import fs from 'fs';

// Ensure the catalog file exists or create it if it doesn't
const catalogFilePath = './data/groups.json';
if (!fs.existsSync(catalogFilePath)) {
    fs.writeFileSync(catalogFilePath, '{}'); // Initialize with an empty object
}

// Helper function to read catalogs from file
function readCatalogsFromFile() {
    const data = fs.readFileSync(catalogFilePath, 'utf8');
    return JSON.parse(data);
}

let catalogs = readCatalogsFromFile();

// Helper function to recursively add catalog to the hierarchy
function addCatalog(parent, name, id, slug, size_id = null) {
    if (!parent[name]) {
        parent[name] = { id: id, slug: slug, size_id: size_id, children: {} };
    }
    return parent[name].children;
}

// Helper function to save the entire catalog hierarchy to file
function saveCatalogsToFile() {
    fs.writeFileSync(catalogFilePath, JSON.stringify(catalogs, null, 2)); // Pretty print JSON
}

async function fetchAndProcessCatalogs() {
    const agent = new SeleniumChromeAgent();
    const driver = await agent.getDriver();

    let catalogId = 3496; // Start from catalog ID 1

    while (catalogId < 6000) { // Example arbitrary stop condition
        const url = `https://www.vinted.fr/catalog/${catalogId}`;
        console.log(`Checking catalog at ${url}...`);

        try {
            await driver.get(url);

            // wait for that .breadcrumbs__item a to appear
            await driver.wait(until.elementLocated(By.css('.breadcrumbs__item a')), 10000);

            await DriverUtils.checkForCookieConsent(driver);

            let hasSizeFilter = false;

            // click on that <button class="web_ui__Chip__chip web_ui__Chip__outlined" type="button" data-testid="catalog--size-filter--trigger" aria-expanded="false"><div class="web_ui__Chip__text"><span class="web_ui__Text__text web_ui__Text__subtitle web_ui__Text__left web_ui__Text__amplified web_ui__Text__truncated" data-testid="catalog--size-filter--trigger--text">Taille</span></div><div class="web_ui__Chip__suffix" data-testid="catalog--size-filter--trigger--suffix"><span class="web_ui__Icon__icon" style="width: 16px;"><svg viewBox="0 0 16 16" width="16" height="16"><g fill="none" fill-rule="evenodd"><path d="M0 0h16v16H0z"></path><path fill="currentColor" d="m14.002 5.552-1.061-1.051-4.94 4.897L3.06 4.501 2 5.552l6.001 5.949z"></path></g></svg></span></div></button>
            try {
                const sizeFilterButton = await driver.findElement(By.css('button[data-testid="catalog--size-filter--trigger"]'));

                if (sizeFilterButton) {
    
                    await sizeFilterButton.click();
    
                }

                hasSizeFilter = true;
            } catch (error) {
                console.log("No size filter button found.");
            }


            // wait that this appears : <div class="web_ui__Cell__suffix"
            await driver.wait(until.elementLocated(By.css('.web_ui__Cell__suffix')), 10000);
            
            const html = await driver.getPageSource();

            const $ = cheerio.load(html);

            const breadcrumbs = $('.breadcrumbs__item a');
            if (breadcrumbs.length === 0) {
                console.log(`No breadcrumbs found for catalog ${catalogId}, likely a 404.`);
            } else {
                // get the sizes_id of the catalog
                //<div id="size_ids_4-list-item-1226" class="web_ui__Cell__cell web_ui__Cell__default web_ui__Cell__navigating" role="button" tabindex="0" data-testid="selectable-item-size-1226"><div class="web_ui__Cell__content"><div class="web_ui__Cell__heading"><div class="web_ui__Cell__title" data-testid="selectable-item-size-1226--title"><h2 class="web_ui__Text__text web_ui__Text__title web_ui__Text__left">XXXS / 30 / 2</h2><div class="web_ui__Spacer__regular web_ui__Spacer__vertical"></div><h3 class="web_ui__Text__text web_ui__Text__subtitle web_ui__Text__left">(500+)</h3></div></div></div><div class="web_ui__Cell__suffix" data-testid="selectable-item-size-1226--suffix"><div class="u-no-pointer-events"><label for="size_ids_4_" data-testid="filter-group-list-1226" class="web_ui__Checkbox__checkbox"><input type="checkbox" id="size_ids_4_" name="size_ids_4[]" data-testid="filter-group-list-1226--input" aria-labelledby="size_ids_4-list-item-1226" value="1"><span class="web_ui__Checkbox__button web_ui__Checkbox__button-left"></span></label></div></div></div>
                // get the div id that starts with size_ids_{size_id} and no care about the rest
                // just get one 

                let size_id = null;

                if (hasSizeFilter) {
                    size_id = $('[id^="size_ids_"]').attr('id');
                    size_id = size_id.split('-')[0]
                    size_id = size_id.split('_').pop();
                    size_id = parseInt(size_id);
                }

                // if size_id is not found, it means that the catalog has no sizes
                if (!size_id) {
                    console.log(`Catalog ${catalogId} has no sizes`);
                    size_id = null;
                }

                console.log(`Catalog ${catalogId} has size_id ${size_id}`);

                let parent = catalogs;
                breadcrumbs.each(function() {
                    const name = $(this).find('span[itemprop="title"]').text().trim();
                    const href = $(this).attr('href');
                    // Assuming ID is always first part before '-' and slug is always after '-'
                    const id = parseInt(href.split('-')[0].split('/').pop());

                    // only split the first dash to remove the id from the slug
                    const slug = href.split('-').slice(1).join('-');
                    
                    if (id === catalogId) {
                        parent = addCatalog(parent, name, id, slug, size_id);
                    } else {
                        parent = addCatalog(parent, name, id, slug);
                    }
                });



                saveCatalogsToFile();
                console.log(`Catalog ${catalogId} processed.`);
            }
        } catch (error) {
            console.error(`Error fetching catalog ${catalogId}:`, error);
        }

        catalogId++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Throttle requests
    }

    console.log("Finished checking catalogs.");
    await driver.quit();
}

fetchAndProcessCatalogs().catch(error => {
    console.error("An error occurred while fetching catalogs:", error);
});
