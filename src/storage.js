const fs = require('fs');
const config = require('../config.json');
const Logger = require('./logger').logger;

function saveWatchingAddresses(watchingAddresses){
    try{
        fs.writeFileSync(config.storageFile, JSON.stringify(watchingAddresses, null, "  "));
    }catch(error){
        Logger.info("Impossible to save watching addresses to the storage.");
    }
}

function loadWatchingAddresses(){
    let watchingAddresses = [];
    try{
        watchingAddresses = JSON.parse(fs.readFileSync(config.storageFile).toString());
    }catch(error){
        Logger.info(`Impossible to load watching addresses from a storage: ${JSON.stringify(error)}`);
    }
    return watchingAddresses;
}

module.exports ={
    saveWatchingAddresses, loadWatchingAddresses
}