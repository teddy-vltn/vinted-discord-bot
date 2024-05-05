export class UrlTransformer {
    static VINTED_API_URL = "https://www.{domain}/api/v2/catalog";
    
    /**
     * Validates if the provided string is a well-formed URL.
     *
     * @param {string} url - The URL to validate.
     * @returns {boolean} - True if the URL is valid, otherwise false.
     */
    static isUrlValid(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Transforms a Vinted URL to the corresponding API URL with additional parameters.
     *
     * @param {string} url - The original Vinted URL to be transformed.
     * @returns {string} - The transformed API URL.
     */
    static transform(url) {
        if (!this.isUrlValid(url)) {
            throw new Error("Invalid URL provided");
        }

        const domainMatch = url.match(/:\/\/(www\.)?([^\/]+)/);
        if (!domainMatch) {
            throw new Error("URL must include a domain.");
        }
        const domain = domainMatch[2];

        const vintedUrl = this.VINTED_API_URL.replace("{domain}", domain);
        const order = "order=newest_first";
        const per_page = "per_page=15";

        url = url.replace(/%5B%5D/g, "");

        if (url.includes("catalog?")) {
            let params = url.substring(url.indexOf('?'));
            params = params.replace("catalog", "catalog_ids");
            return `${vintedUrl}/items${params}&${order}&${per_page}`;
        } else if (url.includes("catalog/")) {
            let catalog_slug = url.substring(url.lastIndexOf('/') + 1);
            let catalogId = catalog_slug.split('-')[0];
            return `${vintedUrl}/items?catalog_ids=${catalogId}&${order}&${per_page}`;
        } else {
            throw new Error("URL does not match expected Vinted product or catalog paths.");
        }
    }
}
