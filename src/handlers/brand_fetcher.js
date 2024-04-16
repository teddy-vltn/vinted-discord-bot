import { By, until } from 'selenium-webdriver';
import cheerio from 'cheerio';
//import { SeleniumChromeAgent } from '../selenium_agent.js';
import fs from 'fs';

const accentsMap = {
    'a': ['à', 'â', 'ä', 'á', 'ã', 'å', 'ā', 'ă', 'ą', 'ǎ', 'ǟ', 'ǡ', 'ǻ', 'ȁ', 'ȃ', 'ȧ', 'ɐ', 'ḁ', 'ẚ', 'ạ', 'ả', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'ₐ', 'ⱥ', 'ａ'],
    'e': ['é', 'è', 'ê', 'ë', 'ē', 'ĕ', 'ė', 'ę', 'ě', 'ȅ', 'ȇ', 'ȩ', 'ɇ', 'ḕ', 'ḗ', 'ḙ', 'ḛ', 'ḝ', 'ẹ', 'ẻ', 'ẽ', 'ế', 'ề', 'ể', 'ễ', 'ệ', 'ₑ', 'ｅ'],
    'i': ['ì', 'í', 'î', 'ï', 'ĩ', 'ī', 'ĭ', 'į', 'ǐ', 'ȉ', 'ȋ', 'ɨ', 'ḭ', 'ḯ', 'ỉ', 'ị', 'ｉ'],
    'o': ['ò', 'ó', 'ô', 'ö', 'õ', 'ø', 'ō', 'ŏ', 'ő', 'ǒ', 'ǫ', 'ǭ', 'ǿ', 'ȍ', 'ȏ', 'ȫ', 'ȭ', 'ȯ', 'ȱ', 'ɵ', 'ơ', 'ŏ', 'ỏ', 'ọ', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ', 'ｏ'],
    'u': ['ù', 'ú', 'û', 'ü', 'ũ', 'ū', 'ŭ', 'ů', 'ű', 'ǔ', 'ǖ', 'ǘ', 'ǚ', 'ǜ', 'ȕ', 'ȗ', 'ư', 'ụ', 'ủ', 'ứ', 'ừ', 'ử', 'ữ', 'ự', 'ｕ'],
    'c': ['ç', 'ć', 'ĉ', 'ċ', 'č', 'ȼ', 'ɕ', 'ḉ', 'Ⱳ', 'ｃ'],
    'n': ['ñ', 'ń', 'ņ', 'ň', 'ŉ', 'ŋ', 'ǹ', 'ȵ', 'ɲ', 'ɳ', 'ṅ', 'ṇ', 'ṉ', 'ṋ', 'ⁿ', 'ｎ'],
    's': ['ś', 'ŝ', 'ş', 'š', 'ș', 'ʂ', 'ṡ', 'ṣ', 'ṥ', 'ṧ', 'ṩ', 'ｓ'],
    'z': ['ź', 'ż', 'ž', 'ƶ', 'ȥ', 'ɀ', 'ⱬ', 'ᵶ', 'ᶎ', 'ẑ', 'ẓ', 'ẕ', 'ｚ'],
    'ae': ['æ', 'ǽ', 'ǣ'],
    'oe': ['œ'],
    // Add other mappings as needed
};

function normalizeBrandName(brandName) {
    for (const [normalized, variants] of Object.entries(accentsMap)) {
        const regex = new RegExp(variants.join('|'), 'g');
        brandName = brandName.replace(regex, normalized);
    }
    return brandName;
}

const brandFilePath = './data/brand.json';

function readBrandsFromFile() {
    const data = fs.readFileSync(brandFilePath, 'utf8');
    return JSON.parse(data);
}

function addBrandToFile(knownBrands, brand) {
    let k = { ...knownBrands, ...brand };
    fs.writeFileSync(brandFilePath, JSON.stringify(k, null, 2)); // Pretty print JSON
}

class BrandIdFetcher {
    constructor(driver, saveBrand = false) {
        this.driver = driver;
        this.saveBrand = saveBrand;
    }

    async getBrandId(brandName) {

        brandName = normalizeBrandName(brandName);

        // replace special characters with nothing
        brandName = brandName.replace(/[^a-zA-Z0-9 ]/g, '');

        // if brand name has spaces, replace them with dashes
        // if brand name has "'", replace it with nothing
        brandName = brandName.replace(/ /g, '-').replace(/'/g, '');

        // if two or more dashes in a row, replace them with one dash
        brandName = brandName.replace(/-+/g, '-');

        // if brand name starts with dash, remove it
        brandName = brandName.replace(/^-/, '');

        const url = `https://www.vinted.fr/brand/${brandName}`;
        await this.driver.get(url);
        // wait for page to fully load
        await this.driver.wait(until.elementLocated(By.tagName('body')), 10000);

        if (await this.driver.getTitle() === '404') {
            console.log('Brand not found');
            return null;
        }

        // if text "La page n'existe pas" in title then brand not found
        if (await this.driver.getTitle() === 'La page n\'existe pas') {
            console.log('Brand not found');
            return null;
        }

        // look in html <link rel="canonical" href="https://www.vinted.fr/brand/53-nike"/>
        const html = await this.driver.getPageSource();
        const parser = new BrandIdParser();
        let brandId = parser.parseBrandId(html);

        if (this.saveBrand) {
            let knownBrands = readBrandsFromFile();

            if (knownBrands[brandName] === undefined) {
                addBrandToFile(knownBrands, { [brandName]: brandId });
            }
        }

        return brandId;
    }

    async close() {
        await this.driver.quit();
    }
}

class BrandIdParser {
    constructor() {
        this.cheerio = cheerio;
    }

    parseBrandId(html) {
        const $ = this.cheerio.load(html);
        const link = $('link[rel="canonical"]').attr('href');
        console.log('Link:', link);
        const brandId = link.split('/').pop().split('-')[0];

        return brandId;
    }
}

export { BrandIdFetcher };

/*
async function main() {

    const agent = new SeleniumChromeAgent();
    const driver = await agent.getDriver();
    const fetcher = new BrandIdFetcher(driver);
    const brandId = await fetcher.getBrandId('nike');
    await fetcher.close();
}

main();*/