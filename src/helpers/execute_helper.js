import Logger from "../utils/logger.js";

const errorStatusMap = {};

/**
 * @typedef {Object} DetailedExecutionResultSuccess
 * @property {boolean} success - Indicates if the operation was successful.
 * @property {number} code - The HTTP status code representing the result.
 * @property {any} result - Contains the primary result data of the successful operation.
 */

/**
 * @typedef {Object} DetailedExecutionResultError
 * @property {boolean} success - Indicates if the operation was successful.
 * @property {number} code - The HTTP status code representing the error.
 * @property {string} error - The error message providing more information.
 */

/**
 * A utility function that wraps an asynchronous function with detailed error handling, including HTTP status codes.
 * @param {Function} asyncFn - The asynchronous function to be executed.
 * @param {...any} params - Arguments to be passed to the asynchronous function.
 * @returns {Promise<DetailedExecutionResultSuccess|DetailedExecutionResultError>} - An object containing the response status, code, and result or error message.
 */
async function executeWithDetailedHandling(asyncFn, ...params) {
    try {
        if (typeof asyncFn !== 'function') {
            throw new TypeError('asyncFn must be a function');
        }

        const result = await asyncFn(...params);

        return { 
            success: true,
            code: 200, // HTTP status for OK
            ...result
        };
    } catch (error) {
        if (!error) {
            throw new Error('An unknown error occurred');
        }

        // Determine the status code based on the type of error
        const statusCode = determineStatusCode(error);

        return {
            success: false,
            code: statusCode,
            error: error.message || 'An unknown error occurred'
        };
    }
}

/**
 * Determines the HTTP status code based on the error type using a mapping object.
 */
function determineStatusCode(error) {
    return errorStatusMap[error.name] || 500; // Default to 500 if error name is not mapped
}

/**
 * Factory function for creating custom Error classes with predefined names.
 */
function createCustomError(name, defaultStatusCode) {
    errorStatusMap[name] = defaultStatusCode

    return class extends Error {
        constructor(message) {
            super(message);
            this.name = name;
            this.statusCode = defaultStatusCode;
        }
    };
}

// Custom error classes using the factory function
const NotFoundError = createCustomError("NotFoundError", 404);
const UnauthorizedError = createCustomError("UnauthorizedError", 401);
const ForbiddenError = createCustomError("ForbiddenError", 403);
const BadRequestError = createCustomError("BadRequestError", 400);
const RateLimitError = createCustomError("RateLimitError", 429);
const SaveError = createCustomError("SaveError", 500);

export { 
    executeWithDetailedHandling, 
    NotFoundError,
    UnauthorizedError, 
    ForbiddenError,
    BadRequestError,
    RateLimitError,
    SaveError
};