import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import ConfigurationManager from './config_manager.js';

const devMode = ConfigurationManager.getDevMode

class Logger {
    static logFilePath = path.join(process.cwd(), 'app.log');

    static initialize() {
        if (!fs.existsSync(Logger.logFilePath)) {
            fs.writeFileSync(Logger.logFilePath, '');
        }
    }

    static info(message) {
        Logger.log('INFO', message, chalk.green);
    }

    static warn(message) {
        Logger.log('WARN', message, chalk.yellow, true);
    }

    static error(message) {
        Logger.log('ERROR', message, chalk.red, true);  // Pass `true` to indicate this is an error
    }

    static debug(message) {
        if (!devMode) {
            return;
        }

        Logger.log('DEBUG', message, chalk.magenta);
    }

    static log(level, message, colorFn, includeSource = false) {

        const timestamp = new Date().toISOString();
        const formattedLevel = colorFn(`[${level}]`);
        let logMessage = `${timestamp} ${formattedLevel}: ${message}`;

        if (includeSource) {
            // get stack of the message
            const source = Logger.getCallSource();
            logMessage += ` [${source}]`;
        }

        console.log(logMessage);
        fs.appendFileSync(Logger.logFilePath, `${logMessage}\n`);
    }

    static getCallSource() {
        const stack = new Error().stack; // Create an Error and capture the stack
        const stackLines = stack.split('\n');
        let callerLine = stackLines[4]; // Get the relevant caller line from stack; Adjust this number based on where this method is within your stack trace

        if (callerLine) {
            callerLine = callerLine.replace(/^\s+at\s+/g, ''); // Clean up the stack trace line
            return callerLine;
        }

        return 'Unknown caller';
    }
}

Logger.initialize(); // Ensure log file is initialized at startup

export default Logger;
