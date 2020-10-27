const express = require('express');
const bodyParser = require('body-parser');
const {body, validationResult, param} = require('express-validator');
const {MonitorApp} = require('@timophey01/eth-bulk-monitor-client-nodejs');
const Blockchain = require('./blockchain');
const Storage = require('./storage');
const Logger = require('./logger').logger;
const config = require('../config.json');
let watchingAddresses = []; //inmemory storage of watching information
const monitorApp = new MonitorApp(config.monitor.key, {
    network: config.monitor.network,
    tmpFile: config.monitor.tmpFile
});

/* Start of the watching for a new address.
 */
function watch() {
    if (watchingAddresses.length>0) monitorApp.watch([
            watchingAddresses.map(x=>x.address),
        ],
        async (data) => {
            const index = watchingAddresses.findIndex(watchingAddress => watchingAddress.address === data.address.toLowerCase());
            const watchingAddress = watchingAddresses[index];
            if (index !== -1 && data.data.to.toLowerCase() === data.address.toLowerCase()) {
                Logger.info(`Received new data for the address ${data.address}: ${JSON.stringify(data.data)}`);
                if (data.data.contract) {
                    if (config.rates.find(rate => rate.to.toLowerCase() === watchingAddress.changeTo &&
                        rate.from.toLowerCase() === data.data.contract.toLowerCase())) {
                        watchingAddresses.splice(index, 1);
                        watch();
                        return Blockchain.depositAddressWithGas(watchingAddress, data.data);
                    } else {
                        Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(data.data)}`);
                    }
                } else {
                    if (await Blockchain.isValueGreaterThanGasFee(data.data.value)) {
                        if (config.rates.find(rate => rate.to.toLowerCase() === watchingAddress.changeTo &&
                            rate.from.toLowerCase() === '0x0000000000000000000000000000000000000000')) {
                            watchingAddresses.splice(index, 1);
                            watch();
                            return Blockchain.sendEthToTheColdAddress(watchingAddress, data.data);
                        } else {
                            Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(data.data)}`);
                        }
                    } else {
                        Logger.info(`Transaction value ${JSON.stringify(data.data.value)} less than current gas fee`);
                    }
                }
            }
        });
    Storage.saveWatchingAddresses(watchingAddresses);
}

watchingAddresses = Storage.loadWatchingAddresses();
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
        param('address').exists().isEthereumAddress().bail().custom(address => {
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