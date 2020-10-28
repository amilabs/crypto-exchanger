const fs = require('fs');
const config = require('../config.json');
const Logger = require('./logger').logger;

/**
 * Function for saving watching addresses to the json file. You can implement any type of storage like mongodb.
 * This storage isn't secured. Every private keys keeps as plain text because this is just an example.
 * DON'T USE IT IN PRODUCTION MODE
 * @param watchingAddresses - array of watching addresses
 */
function saveWatchingAddresses(watchingAddresses) {
    try {
        fs.writeFileSync(config.storageFile, JSON.stringify(watchingAddresses, null, "  "));
    } catch (error) {
        Logger.info("Impossible to save watching addresses to the storage.");
    }
}

/**
 * Function for loading watching addresses from the json file
 * @returns {[]}  - array of watching addresses
 */
function loadWatchingAddresses() {
    let watchingAddresses = [];
    try {
        watchingAddresses = JSON.parse(fs.readFileSync(config.storageFile).toString());
    } catch (error) {
        Logger.info(`Impossible to load watching addresses from a storage: ${JSON.stringify(error)}`);
    }
    return watchingAddresses;
}

module.exports = {
    saveWatchingAddresses, loadWatchingAddresses
}