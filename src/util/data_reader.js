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
        this.data = data;
        this.fuse = null;
        this.fuseOptions = {
            keys: ['name'],
            threshold: 0.4, // Lower threshold to be more selective
            includeScore: true,
            ignoreLocation: true, // Ignores where in the string the match is
            ignoreFieldNorm: true,
            useExtendedSearch: true // Enable extended search for finer control
        };
    }

    /**
     * Recursively flattens the category structure to make it searchable with Fuse.js.
     */
    flattenCategories(categories, path = '') {
        let flatList = [];

        try {
            Object.entries(categories).forEach(([key, value]) => {
                const currentPath = path ? `${path} ${key}` : key;
    
                value.name = currentPath;
    
                flatList.push(value);
                if (value.children && Object.keys(value.children).length > 0) {
                    flatList = flatList.concat(this.flattenCategories(value.children, currentPath));
                }
            });
            return flatList;
        } catch (error) {
            const transformed = [];

            // convert name: id to {name: name, id: id}
            Object.entries(categories).forEach(([key, value]) => {
                const name = key;
                const id = value;

                transformed.push({name, id});
            });

            return transformed;
        }

    }

    /**
     * Initializes the Fuse.js search instance with flattened category data.
     */
    initializeSearch() {
        const flattenedData = this.flattenCategories(this.data);
        this.fuse = new Fuse(flattenedData, this.fuseOptions);
    }

    /**
     * Searches for a category by name, returning either the best match or all matches.
     */
    getBestMatch(name, bestMatch = true) {
        if (!this.fuse) {
            this.initializeSearch();
        }

        const results = this.fuse.search(name);
        if (results.length > 0) {
            // Prioritize exact matches first if any
            const exactMatches = results.filter(result => result.item.name.endsWith(`> ${name}`) || result.item.name === name);
            if (exactMatches.length > 0) {
                return exactMatches[0].item;
            }

            // If no exact matches, return the best match or all matches
            if (bestMatch) {
                // remove children from the result to avoid confusion
                delete results[0].item.children;                
                return results[0].item
            }
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