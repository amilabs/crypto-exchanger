const express = require('express');
const bodyParser = require('body-parser');
const {body, validationResult, param} = require('express-validator');
const {MonitorApp} = require('@timophey01/eth-bulk-monitor-client-nodejs');
const Blockchain = require('./blockchain');
const Storage = require('./storage');
const Logger = require('./logger').logger;
const config = require('../config.json');
const Rates = require('./rates');
let watchingAddresses = []; //inmemory storage of watching information
const monitorApp = new MonitorApp(config.monitor.key, {
    network: config.monitor.network,
    tmpFile: config.monitor.tmpFile
});

/* Start of the watching for a new address.
 */


function formatWatchingData(watchingData){
    watchingData.address = watchingData.address.toLowerCase();
    watchingData.data.to =  watchingData.data.to.toLowerCase();
    watchingData.data.from =  watchingData.data.from.toLowerCase();
    if (watchingData.data.contract) watchingData.data.contract= watchingData.data.contract.toLowerCase();
    return watchingData;
}

function watch() {
    if (watchingAddresses.length>0) monitorApp.watch([
            watchingAddresses.map(x=>x.address),
        ],
        async (data) => {
            const watchingData = formatWatchingData(data);
            const index = watchingAddresses.findIndex(watchingAddress => watchingAddress.address === watchingData.address);
            const watchingAddress = watchingAddresses[index];
            if (index !== -1 && watchingData.data.to === watchingData.address) {
                Logger.info(`Received new data for the address ${watchingData.address}: ${JSON.stringify(watchingData.data)}`);
                if (watchingData.data.contract) {
                    if (Rates.getRate(watchingAddress.changeTo,watchingData.data.contract)) {
                        watchingAddresses.splice(index, 1);
                        watch();
                        return Blockchain.depositAddressWithGas(watchingAddress, watchingData.data);
                    } else {
                        Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(watchingData.data)}`);
                    }
                } else {
                    if (await Blockchain.isValueGreaterThanGasFee(watchingData.data.value)) {
                        if (Rates.getRate(watchingAddress.changeTo,'0x0000000000000000000000000000000000000000')) {
                            watchingAddresses.splice(index, 1);
                            watch();
                            return Blockchain.sendEthToTheColdAddress(watchingAddress, watchingData.data);
                        } else {
                            Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(watchingData.data)}`);
                        }
                    } else {
                        Logger.info(`Transaction value ${JSON.stringify(watchingData.data.value)} less than current gas fee`);
                    }
                }
            }
        });
    Storage.saveWatchingAddresses(watchingAddresses);
}

watchingAddresses = Storage.loadWatchingAddresses();
watch();
const app = express().use(bodyParser.json());

app.get('/watchingAddresses', (req, res) => {
    res.status(200).json({watchingAddresses});
});

app.delete('/clearWatchingAddresses', (req, res) => {
    watchingAddresses = [];
    watch();
    res.status(200).json({watchingAddresses});
});

app.delete('/watchingAddresses/:address',[
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
        const index = watchingAddresses.findIndex(watchingAddress =>
            watchingAddress.address === req.params.address.toLowerCase());
        watchingAddresses.splice(index, 1);
        watch();
        res.status(200).json({watchingAddresses});
});

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
        watchingAddresses.push(newAddress);
        watch();
        res.status(200).json({address: newAddress.address});
    });

app.listen(config.port, () => Logger.info("Starting server"));