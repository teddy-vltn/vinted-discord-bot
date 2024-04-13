import Fuse from 'fuse.js';
import fs from 'fs';

class DataReader {
    // Class that reads brand data from a JSON file
    constructor(filename, baseFilePath="./data/") {
        const filePath = baseFilePath + filename + ".json";
        this.data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    getData = () => {
        return this.data;
    }

    getSubData = (key) => {
        return this.data[key];
    }
}

class IntelligentNameIDFinder {
    constructor(data) {
        const options = {
            keys: ['name'],
            threshold: 0.3
        };
        this.data = Object.entries(data).map(([name, id]) => ({ name, id }));
        this.fuse = new Fuse(this.data, options);
    }

    getId(name, bestMatch = true) {
        const results = this.fuse.search(name);
        if (results.length > 0 && bestMatch) {
            const bestMatch = results[0].item;
            return bestMatch.id
        }

        if (results.length > 0) {
            return results.map(result => result.item.id);
        }
        
        return null;
    }
}

export { DataReader, IntelligentNameIDFinder };

// Usage:
/*
    const reader = new DataReader('groups');
    const data = reader.getData();
    const finder = new IntelligentNameIDFinder(data);

    const brandName = 'Taill Homme';
    const brandId = finder.getId(brandName);
    console.log(`ID for ${brandName}: ${brandId}`);
*/