const express = require('express');
const bodyParser = require('body-parser');
const {body, validationResult} = require('express-validator');
const {MonitorApp} = require('@timophey01/eth-bulk-monitor-client-nodejs');
const Blockchain = require('./blockchain');
const Logger = require('./logger').logger;
const config = require('../config.json');
let watchingAddresses = []; //inmemory storage of watching information
const monitorApp = new MonitorApp(config.monitor.key, {
    network: config.monitor.network,
    tmpFile: config.monitor.tmpFile
});

/* Start of the watching for a new address.
@todo Need to fix this function with new unwatch support
 */
function waitTransaction(newAddress) {
    watchingAddresses.push(newAddress)
    monitorApp.watch([
            newAddress.address,
        ],
        async (data) => {
            const index = watchingAddresses.findIndex(watchingAddress => watchingAddress.address === data.address.toLowerCase());
            if (index !== -1) {
                Logger.info(`Received new data for the address ${data.address}: ${JSON.stringify(data.data)}`);
                if (data.data.contract) {
                    if (config.rates.find(rate => rate.to.toLowerCase() === newAddress.changeTo &&
                        rate.from.toLowerCase() === data.data.contract.toLowerCase())) {
                        monitorApp.saveState();
                        watchingAddresses.splice(index, 1);
                        return Blockchain.depositAddressWithGas(newAddress, data.data);
                    } else {
                        Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(data.data)}`);
                    }
                } else {
                    if (await Blockchain.isValueGreaterThanGasFee(data.data.value)) {
                        if (config.rates.find(rate => rate.to.toLowerCase() === newAddress.changeTo &&
                            rate.from.toLowerCase() === '0x0000000000000000000000000000000000000000')) {
                            monitorApp.saveState();
                            watchingAddresses.splice(index, 1);
                            return Blockchain.sendEthToTheColdAddress(newAddress, data.data);
                        } else {
                            Logger.info(`Received not supported tokens for exchange: ${JSON.stringify(data.data)}`);
                        }
                    } else {
                        Logger.info(`Transaction value ${JSON.stringify(data.data.value)} less than current gas fee`);
                    }
                }
            }
        });
}

const app = express().use(bodyParser.json());
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
        waitTransaction(newAddress);
        res.status(200).json({address: newAddress.address});
    });

app.listen(config.port, () => Logger.info("Starting server"));