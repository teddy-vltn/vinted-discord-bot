import RequestBuilder from "../utils/request_builder.js";
import Logger from "../utils/logger.js";

// The trimmed catalog response carries no description, brand, category or seller
// rating. The same data sits in the server rendered payload of the item page, which
// is where it is read from, because Vinted removed the item detail API.
const ITEM_PAGE_TIMEOUT_MS = 30_000;

/**
 * Reads a single JSON value that follows the given key in an unescaped payload.
 * @param {string} payload - Unescaped page payload.
 * @param {string} key - JSON key to look for.
 * @returns {string|number|undefined} - Parsed value, or undefined when not found.
 */
function readValue(payload, key) {
    const marker = `"${key}":`;
    const index = payload.indexOf(marker);
    if (index === -1) {
        return undefined;
    }

    const start = index + marker.length;

    if (payload[start] === '"') {
        let escaped = false;
        for (let i = start + 1; i < payload.length; i++) {
            const char = payload[i];
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                try {
                    return JSON.parse(payload.slice(start, i + 1));
                } catch (error) {
                    return undefined;
                }
            }
        }
        return undefined;
    }

    const match = payload.slice(start, start + 40).match(/^-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : undefined;
}

/**
 * Fetches item details that the catalog response no longer carries.
 * Returns an empty object on any failure, so a missing detail never breaks a notification.
 * @param {Object} params - Parameters for fetching the detail.
 * @param {string} params.cookie - Cookie for authentication.
 * @param {string} params.url - URL of the item page.
 * @returns {Promise<Object>} - Detail fields, empty object on failure.
 */
export async function fetchItemDetail({ cookie, url }) {
    try {
        const response = await RequestBuilder.get(url)
                        .setNextProxy()
                        .setCookie(cookie)
                        .setHeaders({ 'Accept': 'text/html,application/xhtml+xml' })
                        .setTimeout(ITEM_PAGE_TIMEOUT_MS)
                        .send();

        if (!response.success) {
            return {};
        }

        const payload = String(response.data)
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');

        return {
            description: readValue(payload, 'description'),
            brandId: readValue(payload, 'brand_id'),
            catalogId: readValue(payload, 'catalog_id'),
            feedbackReputation: readValue(payload, 'feedback_reputation'),
            feedbackCount: readValue(payload, 'feedback_count'),
        };
    } catch (error) {
        Logger.debug(`Error fetching item detail from ${url}: ${error.message}`);
        return {};
    }
}
