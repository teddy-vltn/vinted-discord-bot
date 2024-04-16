import Fuse from 'fuse.js';
import fs from 'fs';

/**
 * A class to read and manage data from JSON files.
 * It loads data from a specified JSON file located within a base directory.
 */
class DataReader {
    /**
     * Initializes a new instance of the DataReader class.
     * @param {string} filename - The name of the file to read without the .json extension.
     * @param {string} baseFilePath - The base file path where JSON files are stored, defaults to "./data/".
     */
    constructor(filename, baseFilePath="./data/") {
        const filePath = baseFilePath + filename + ".json";
        this.data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    /**
     * Retrieves all data loaded from the JSON file.
     * @returns {object} The parsed JSON object from the file.
     */
    getData = () => {
        return this.data;
    }

    /**
     * Retrieves a subset of data based on a key.
     * @param {string} key - The key corresponding to the data subset.
     * @returns {object} The subset of the JSON data.
     */
    getSubData = (key) => {
        return this.data[key];
    }
}

/**
 * A class that uses Fuse.js to perform advanced searching within data, focusing on name identification.
 */
class IntelligentNameIDFinder {
    /**
     * Initializes the IntelligentNameIDFinder with data to search within.
     * @param {object} data - The data to search within, typically loaded from a DataReader.
     */
    constructor(data) {
        this.data = data;
        this.fuse = null;
        this.fuseOptions = {
            keys: ['name'],
            threshold: 0.7, // More selective matching
            includeScore: true,
            ignoreLocation: true, // Ignores the position of match in the text
            ignoreFieldNorm: true,
            useExtendedSearch: true // Allows for more complex queries
        };
    }

    /**
     * Flattens a hierarchical category structure for Fuse.js to search.
     * @param {object} categories - Hierarchical category data.
     * @param {string} path - Current path to a category, used for nested structures.
     * @returns {Array} Flattened list of categories with paths for searching.
     */
    flattenCategories(categories) {
        let flatList = [];

        try {
            Object.entries(categories).forEach(([key, value]) => {
                value.name = key;
    
                flatList.push(value);
                if (value.children && Object.keys(value.children).length > 0) {
                    flatList = flatList.concat(this.flattenCategories(value.children));
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