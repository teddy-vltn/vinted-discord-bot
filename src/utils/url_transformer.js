export class UrlTransformer {
    static VINTED_API_URL = "https://www.{domain}/api/v2/catalog";
    
    static transform(url) {
        const domain = url.substring(url.indexOf('.') + 1, url.indexOf('/', url.indexOf('.') + 1));
        const vintedUrl = this.VINTED_API_URL.replace("{domain}", domain);
        const order = "order=newest_first";
        const per_page = "per_page=15";

        url = url.replace(/%5B%5D/g, "");
        
        if (url.includes("catalog?")) {
            let params = url.substring(url.indexOf('?'));
            params = params.replace("catalog", "catalog_ids");
            return vintedUrl + "/items" + params + "&" + order + "&" + per_page;
        }
        
        if (url.includes("catalog/")) {
            let catalog_slug = url.substring(url.lastIndexOf('/') + 1);
            let catalogId = catalog_slug.split('-')[0];
            return `${vintedUrl}/items?catalog_ids=${catalogId}` + "&" + order + "&" + per_page;
        }
    }
}
