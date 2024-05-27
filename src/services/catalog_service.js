import { NotFoundError, ForbiddenError, executeWithDetailedHandling, RateLimitError } from "../helpers/execute_helper.js";
import ProxyManager from "../utils/http_utils.js";
import Logger from "../utils/logger.js";

import ConfigurationManager from "../utils/config_manager.js";

/**
 * 
 * @param {*} param0 
 * @returns 
 */
async function fetchCatalogItems({ 
    cookie,
    per_page = 30,
    order = 'newest_first',
}) {
    return await executeWithDetailedHandling(async () => {
        const url = `https://www.vinted.fr/api/v2/catalog/items?per_page=${per_page}&order=${order}`;
        const headers = { 'Cookie': cookie };

        const r = await ProxyManager.makeGetRequest(url, headers);

        if (!r.success) {
            throw new NotFoundError("Error fetching catalog items.");
        }

        return { items: r.body.items };
    });
}

async function fetchItem({ cookie, item_id }) {
    return await executeWithDetailedHandling(async () => {

        const url = `https://www.vinted.fr/api/v2/items/${item_id}`;
        const headers = { 'Cookie': cookie };

        const r = await ProxyManager.makeGetRequest(url, headers);

        if (!r.success) {
            switch (r.code) {
                case 404:
                    throw new NotFoundError("Item not found.");
                case 403:
                    throw new ForbiddenError("Access forbidden.");
                case 429:
                    throw new RateLimitError("Rate limit exceeded.");
                default:
                    throw new Error("Error fetching item.");
            }
        }

        return { item: r.body.item };
    });
}

async function findHighestID(cookie) {
    const r = await fetchCatalogItems({ cookie });
    
    if (!r.items) {
        throw new Error("Error fetching catalog items.");
    }

    const maxID = Math.max(...r.items.map(item => parseInt(item.id)));
    return { highestID: maxID };
}

const activePromises = new Set();
const concurrency = ConfigurationManager.getAlgorithmSettings().concurrent_requests;

let consecutiveErrors = 0;
let rateLimitErrorsPerSecond = 0;

let step = 1;

let lastValidItemsPerSecond = 0;
let validItemsPerSecond = 0;

let lastRequestPerSecond = 0;
let requestPerSecond = 0;

let lastPublishedTime = Date.now() - 10000;
let idTimeSinceLastPublication = 0;

let minFetchedRange = 0;
let maxFetchedRange = 0;

let currentID = 0;

let fetchedIds = new Set();

setInterval(() => {
    Logger.info(`Requests per second: ${requestPerSecond}, Step: ${step}, Consecutive errors: ${consecutiveErrors}, Rate limit errors per second: ${rateLimitErrorsPerSecond}, Valid items per second: ${validItemsPerSecond}`);
    Logger.debug(`Active promises: ${activePromises.size}`);
    Logger.debug(`Current ID: ${currentID}, Last published time: ${lastPublishedTime}, ID time since last publication: ${idTimeSinceLastPublication}`); 
    let numberOfItemBetweenRange = maxFetchedRange - minFetchedRange;
    Logger.debug(`minFetchedRange: ${minFetchedRange}, maxFetchedRange: ${maxFetchedRange}, numberOfItemBetweenRange: ${numberOfItemBetweenRange}`);

    rateLimitErrorsPerSecond = 0;

    lastValidItemsPerSecond = validItemsPerSecond;
    validItemsPerSecond = 0;

    lastRequestPerSecond = requestPerSecond;
    requestPerSecond = 0;

    minFetchedRange = 99999999999
    maxFetchedRange = 0
}, 1000);

async function fetchUntilCurrentAutomatic(cookie, callback) {
    if (!cookie) {
        throw new Error("Cookie is required.");
    }
    
    if (rateLimitErrorsPerSecond > 3) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return;
    }

    if (activePromises.size < concurrency) {
        const id = currentID + step;

        currentID = id;

        if (currentID < idTimeSinceLastPublication) {
            currentID = idTimeSinceLastPublication++
        }

        requestPerSecond++;

        fetchedIds.add(id);
        launchFetch(id, cookie, callback);
        adjustStep();
    } else {
        await Promise.race(activePromises);
    }

    await Promise.resolve();
}

function adjustStep() {
    const timeSinceLastPublication = Date.now() - lastPublishedTime;

    if (step < 1) {
        step = 1;
    }

    if (timeSinceLastPublication > 10000) {
        step = Math.min(step * 2 + 5, 50); // Very aggressive fetching if last publication was a long time ago
    } else if (timeSinceLastPublication > 5000) {
        step = Math.min(step * 2, 10); // Aggressive fetching if last publication was a while ago
    } else if (timeSinceLastPublication > 3000 && timeSinceLastPublication < 5000) {
        step = Math.min(step + 1, 3); // Slightly aggressive fetching if last publication was a bit ago
    } else {
        step = 1
    }

    if (consecutiveErrors > 5) {
        step = -2
    }

    step = Math.ceil(step);
}

async function launchFetch(id, cookie, callback) {
    const fetchPromise = fetchAndHandleItemSafe(cookie, id, callback);
    activePromises.add(fetchPromise);
    await fetchPromise.finally(() => {
        activePromises.delete(fetchPromise);
    });
}

async function fetchAndHandleItemSafe(cookie, itemID, callback) {
    const response = await fetchItem({ cookie, item_id: itemID });

    if (response.item) {
        callback(response.item);
        validItemsPerSecond++;

        if (itemID > idTimeSinceLastPublication) {
            idTimeSinceLastPublication = itemID;
            lastPublishedTime = new Date(response.item.updated_at_ts).getTime();
        }
        consecutiveErrors = 0;

        if (itemID < minFetchedRange) {
            minFetchedRange = itemID;
        }

        if (itemID > maxFetchedRange) {
            maxFetchedRange = itemID;
        }
    } else if (response.code === 404) {
        consecutiveErrors++;
    } else if (response.code === 429) {
        rateLimitErrorsPerSecond++;
        Logger.error(`Rate limit error: ${rateLimitErrorsPerSecond}`);
    }

    // resolve the promise to remove it from the active promises set
    return Promise.resolve();
}

async function findHighestIDUntilSuccessful(cookie) {

    while (currentID === 0) {
        try {
            const response = await findHighestID(cookie);
            if (response.highestID) {
                currentID = response.highestID;
                Logger.info(`Highest ID: ${currentID}`);
            }
        } catch (error) {
            //Logger.error("Error fetching highest ID, retrying...");
        }
    }
}

const CatalogService = {
    fetchCatalogItems,
    fetchItem,
    fetchUntilCurrentAutomatic,
    findHighestIDUntilSuccessful,
};

export default CatalogService;