const express = require('express');
const bodyParser = require('body-parser');
const {body, validationResult, param} = require('express-validator');
const swaggerUi = require('swagger-ui-express');
const {MonitorApp} = require('eth-bulk-monitor-client-nodejs');
const Blockchain = require('./blockchain');
const Storage = require('./storage');
const Logger = require('./logger').logger;
const config = require('../config.json');
const Rates = require('./rates');
const swaggerDocument = require('./docs/openapi.json');
let watchingAddresses = []; //inmemory storage of watching information
const monitorApp = new MonitorApp(config.monitor.key, {
    network: config.monitor.network,
    tmpFile: config.monitor.tmpFile
});

watchingAddresses = Storage.loadWatchingAddresses(); //loading stored watching addresses from the storage
watch(); //start watching for addresses from watching

const app = express().use(bodyParser.json());
app.use('/docs', function(req, res, next){
    swaggerDocument.servers[0].url=req.protocol+"://"+req.get('host');
    req.swaggerDoc = swaggerDocument;
    next();
}, swaggerUi.serve, swaggerUi.setup());

app.get('/', function(req, res) {
    res.redirect('/docs');
});

/**
 * Api method for displaying all active watching addresses.
 * Return not secured data with private keys of the watching addresses. This is just an example.
 * DON'T USE IT IN PRODUCTION
 */
app.get('/watchingAddresses', (req, res) => {
    res.status(200).json({watchingAddresses});
});

/**
 * Api method for deleting all watching addresses.
 * You can lose all you data calking this api method.
 * DON'T USE IT IN PRODUCTION WITHOUT ANY AUTH
 */
app.post('/clearWatchingAddresses', (req, res) => {
    watchingAddresses = [];
    monitorApp.monitor.removeAllAddresses();
    Storage.saveWatchingAddresses(watchingAddresses);
    res.status(200).json({watchingAddresses});
});

/**
 * Api method for deleting specific watching addresses.
 * You can lose all you data calking this api method.
 * DON'T USE IT IN PRODUCTION WITHOUT ANY AUTH
 * @param address - ETH address of the watching addresses which will be deleted
 */
app.delete('/watchingAddresses/:address', [
    param('address').isEthereumAddress().bail().custom(address => {
        if (!watchingAddresses.map(watchingAddress => watchingAddress.address).includes(address.toLowerCase())) {
            return Promise.reject(`Address ${address} is not watching`);
        } else {
            return true;
        }
    }),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }
    removeAddressFromWatching(req.params.address.toLowerCase());
    res.status(200).json({watchingAddresses});
});

/**
 * Api method for creating new watching address and start watching. After creating a new address you can send it to a user.
 * Massive calling of this function may charge additional money and reach limits of the watching API
 * DON'T USE IT IN PRODUCTION WITHOUT ANY AUTH
 */
app.post('/exchange',
    [body('changeTo').isEthereumAddress().bail().custom(token => {
        if (!(config.rates).map(rate => rate.to.toLowerCase()).includes(token.toLowerCase())) {
            return Promise.reject(`No currency rate for token ${token}`);
        } else {
            return true;
        }
    })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        let newAddress = await Blockchain.createNewAddress();
        newAddress.changeTo = req.body.changeTo.toLowerCase();
        Logger.info(`New address for changing to ${req.body.changeTo}: ${newAddress.address}`);
        addAddressToWatching(newAddress)
        res.status(200).json({address: newAddress.address});
    });

app.listen(config.port, () => Logger.info("Starting server"));

/**
 * Function for formatting receiving from the watching api
 * @param watchingData - data from watching api
 * @returns {*} - formatted data
 */
function formatWatchingData(watchingData) {
    watchingData.address = watchingData.address.toLowerCase();
    watchingData.data.to = watchingData.data.to.toLowerCase();
    watchingData.data.from = watchingData.data.from.toLowerCase();
    if (watchingData.data.contract) watchingData.data.contract = watchingData.data.contract.toLowerCase();
    return watchingData;
}

/**
 * Function to add new watchingAddress to the watching
 * @param watchingAddress - object of the address for adding to the watching
 */
function addAddressToWatching(watchingAddress){
    watchingAddresses.push(watchingAddress)
    monitorApp.monitor.addAddresses([watchingAddress.address]);
    Storage.saveWatchingAddresses(watchingAddresses);
}

/**
 * Function to remove address from watching
 * @param address - ethereum address for removing from watching
 */
function removeAddressFromWatching(address){
    watchingAddresses.splice(watchingAddresses.indexOf(address), 1);
    monitorApp.monitor.removeAddresses([address]);
    Storage.saveWatchingAddresses(watchingAddresses);
}

function watch() {
    monitorApp.watch(
        async (data) => {
            const watchingData = formatWatchingData(data);
            const index = watchingAddresses.findIndex(watchingAddress => watchingAddress.address === watchingData.address);
            const watchingAddress = watchingAddresses[index];
            if (index !== -1 && watchingAddress && watchingData.data.to === watchingData.address) {
                Logger.info(`Received new data for the address ${watchingData.address}: ${JSON.stringify(watchingData.data)}`);
                if (watchingData.data.contract) {
                    if (Rates.getRate(watchingAddress.changeTo, watchingData.data.contract)) {
                        removeAddressFromWatching(watchingAddress.address);
                        return Blockchain.depositAddressWithGas(watchingAddress, watchingData.data);
                    } else {
                        Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(watchingData.data)}`);
                    }
                } else {
                    if (await Blockchain.isValueGreaterThanGasFee(watchingData.data.value)) {
                        if (Rates.getRate(watchingAddress.changeTo, '0x0000000000000000000000000000000000000000')) {
                            removeAddressFromWatching(watchingAddress.address);
                            return Blockchain.sendEthToTheColdAddress(watchingAddress, watchingData.data);
                        } else {
                            Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(watchingData.data)}`);
                        }
                    } else {
                        Logger.info(`Transaction value ${JSON.stringify(watchingData.data.value)} less than current gas fee`);
                    }
                }
            }else{
                Logger.info(`Received new data for the address ${watchingData.address},`+
                 `but this address not present at the watching addresses: ${JSON.stringify(watchingData.data)}`);
            }
        });
}