import Logger from "../utils/logger.js";
import { fetchCatalogItems } from "../api/fetchCatalogItems.js";
import { fetchItemDetail } from "../api/fetchItemDetail.js";
import { VintedItem } from "../entities/vinted_item.js";
import { buildApiFiltersFromUrl, hasAnyFilter, filterItemsByUrl } from "./url_service.js";
import ConfigurationManager from "../utils/config_manager.js";

// How many items one catalog request pulls. With an interval of tens of seconds a
// single channel does not gain that many items, and a larger page would only transfer
// data that deduplication throws away anyway.
const ITEMS_PER_REQUEST = 20;
// After a rate limit the channel interval is multiplied until a request succeeds again.
const RATE_LIMIT_BACKOFF_FACTOR = 2;
const MAX_BACKOFF_MULTIPLIER = 10;
const HTTP_RATE_LIMIT = 429;

/**
 * Watches every monitored channel separately and reports new items.
 *
 * Every channel has its own timer and its own memory of the last seen ID, so channels
 * are independent and a failure of one does not stop the others. Filtering is done by
 * Vinted on the server, driven by the parameters from the channel URL.
 */
class ChannelMonitorService {
    static states = new Map();
    static config = null;

    /**
     * Starts monitoring.
     * @param {Object} params - Service configuration.
     * @param {Function} params.getChannels - Async function returning monitored channels.
     * @param {Function} params.getCookie - Function returning the current Vinted cookie.
     * @param {number} params.intervalMs - Base interval between checks of one channel.
     * @param {Function} params.onItem - Called as onItem(item, channel) for every new item.
     * @returns {Promise<void>}
     */
    static async start({ getChannels, getCookie, intervalMs, onItem }) {
        this.config = { getChannels, getCookie, intervalMs, onItem };
        await this.refresh();
    }

    /**
     * Stops all timers.
     */
    static stop() {
        for (const state of this.states.values()) {
            clearTimeout(state.timer);
        }
        this.states.clear();
    }

    /**
     * Synchronizes timers with the current list of monitored channels.
     * Called on start and whenever the list of channels changes.
     * @returns {Promise<void>}
     */
    static async refresh() {
        if (!this.config) {
            return;
        }

        let channels;
        try {
            channels = await this.config.getChannels();
        } catch (error) {
            Logger.error(`Failed to load monitored channels: ${error.message}`);
            return;
        }

        const seen = new Set();

        for (const channel of channels) {
            const key = channel.channelId;
            seen.add(key);

            const existing = this.states.get(key);
            if (!existing) {
                this.states.set(key, {
                    channel,
                    lastSeenId: 0,
                    backoffMultiplier: 1,
                    timer: null,
                });
                this.scheduleNext(key, 0);
                continue;
            }

            // A changed URL means a different search, so the last seen ID is forgotten.
            if (existing.channel.url !== channel.url) {
                existing.lastSeenId = 0;
            }
            existing.channel = channel;
        }

        for (const [key, state] of this.states) {
            if (!seen.has(key)) {
                clearTimeout(state.timer);
                this.states.delete(key);
            }
        }

        Logger.info(`Monitoring ${this.states.size} Vinted channels`);
    }

    /**
     * Schedules the next check of one channel.
     * @param {string} key - Channel identifier.
     * @param {number} [delayMs] - Delay before the check; defaults to the channel interval.
     */
    static scheduleNext(key, delayMs) {
        const state = this.states.get(key);
        if (!state) {
            return;
        }

        const delay = delayMs ?? this.config.intervalMs * state.backoffMultiplier;
        state.timer = setTimeout(() => this.checkChannel(key), delay);
    }

    /**
     * Checks one channel for new items.
     * @param {string} key - Channel identifier.
     * @returns {Promise<void>}
     */
    static async checkChannel(key) {
        const state = this.states.get(key);
        if (!state) {
            return;
        }

        try {
            await this.collectNewItems(state);
            state.backoffMultiplier = 1;
        } catch (error) {
            if (error.code === HTTP_RATE_LIMIT) {
                state.backoffMultiplier = Math.min(state.backoffMultiplier * RATE_LIMIT_BACKOFF_FACTOR, MAX_BACKOFF_MULTIPLIER);
                Logger.warn(`Rate limited on channel ${key}, next check in ${this.config.intervalMs * state.backoffMultiplier / 1000}s`);
            } else {
                Logger.error(`Error checking channel ${key}: ${error.message}`);
            }
        }

        // The channel is rescheduled even after an error, otherwise one failure would stop it for good.
        this.scheduleNext(key);
    }

    /**
     * Fetches the channel search results and reports items newer than the last seen one.
     * @param {Object} state - Channel state.
     * @returns {Promise<void>}
     */
    static async collectNewItems(state) {
        const { channel } = state;
        const filters = buildApiFiltersFromUrl(channel.url);

        if (!hasAnyFilter(filters)) {
            Logger.warn(`Channel ${channel.channelId} has no usable filters in its URL, skipping`);
            return;
        }

        const response = await fetchCatalogItems({
            cookie: this.config.getCookie(),
            filters,
            per_page: ITEMS_PER_REQUEST,
        });

        if (!response.success) {
            const error = new Error(response.error || "Error fetching catalog items.");
            error.code = response.code;
            throw error;
        }

        const rawItems = response.items || [];
        if (!rawItems.length) {
            return;
        }

        const highestId = Math.max(...rawItems.map(item => Number(item.id)));

        // The first run only records the current state, otherwise every restart would fire
        // a burst of items the user has already seen.
        if (state.lastSeenId === 0) {
            state.lastSeenId = highestId;
            Logger.info(`Channel ${channel.channelId} synchronized at item ${highestId}`);
            return;
        }

        const newItems = rawItems
            .filter(item => Number(item.id) > state.lastSeenId)
            .sort((a, b) => Number(a.id) - Number(b.id));

        state.lastSeenId = highestId;

        if (!newItems.length) {
            return;
        }

        // A full page of new items means more items appeared between two checks than fit
        // into a single request, and the oldest of them will never be seen.
        if (newItems.length === rawItems.length) {
            Logger.warn(`Channel ${channel.channelId} returned a full page of new items, some may have been missed. Shorten the interval or narrow the search.`);
        }

        await this.reportItems(newItems, channel);
    }

    /**
     * Adds details to new items, applies local filters and hands them over.
     * @param {Array<Object>} rawItems - Raw items from the catalog response.
     * @param {Object} channel - Channel the items belong to.
     * @returns {Promise<void>}
     */
    static async reportItems(rawItems, channel) {
        const concurrency = Math.max(1, Number(ConfigurationManager.getAlgorithmSetting.concurrent_requests) || 1);
        const filterZeroStars = ConfigurationManager.getAlgorithmSetting.filter_zero_stars_profiles;
        const cookie = this.config.getCookie();

        for (let i = 0; i < rawItems.length; i += concurrency) {
            const batch = rawItems.slice(i, i + concurrency);

            const items = await Promise.all(batch.map(async raw => {
                const item = new VintedItem(raw);
                const detail = await fetchItemDetail({ cookie, url: item.url });
                return item.mergeDetail(detail);
            }));

            for (const item of items) {
                if (filterZeroStars && item.getNumericStars() === 0) {
                    continue;
                }

                // Only what the server cannot do is left: banned keywords and fuzzy text match.
                const [matched] = filterItemsByUrl([item], channel.url, channel.bannedKeywords || []);
                if (!matched) {
                    continue;
                }

                await this.config.onItem(item, channel);
            }
        }
    }
}

export default ChannelMonitorService;
