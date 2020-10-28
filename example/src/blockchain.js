const Web3 = require('web3');
const config = require('../config.json');
const Tx = require('ethereumjs-tx').Transaction;
const fs = require('fs');
const web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.networkUrl));
const Logger = require('./logger').logger;
const Integrations = require('./integrations');
const hardfork = "istanbul";

/**
 * Function for the depositing your watching address by the gas from you cold address.
 * We need it for the sending tokens to the cold address.
 * @param watchingAddress - watching address which will be replenished with the gas
 * @param txData - data from watching api
 */
async function depositAddressWithGas(watchingAddress, txData) {
    const gasPrice = await web3.eth.getGasPrice();
    const abi = JSON.parse(fs.readFileSync('abi.json', 'utf-8'));
    const contract = new web3.eth.Contract(abi, txData.contract);
    const data = contract.methods.transfer(config.coldAddress.address, txData.rawValue.toString()).encodeABI();
    const estGas = (await web3.eth.estimateGas({
        "from": watchingAddress.address,
        "nonce": await web3.eth.getTransactionCount(watchingAddress.address),
        "gasPrice": gasPrice,
        "to": txData.contract,
        "value": "0x00",
        "data": data
    })) - config.blockchain.gasRefund;

    const value = gasPrice * estGas;
    const rawTransaction = {
        "from": config.coldAddress.address,
        "nonce": web3.utils.numberToHex(await web3.eth.getTransactionCount(config.coldAddress.address)),
        "gasPrice": web3.utils.numberToHex(gasPrice),
        "gasLimit": web3.utils.numberToHex(config.blockchain.gasLimit),
        "to": watchingAddress.address,
        "value": web3.utils.numberToHex(value)
    };

    Logger.info(`Sending ${web3.utils.fromWei(value.toString())} ETH to the address ${watchingAddress.address} as gas`);
    web3.eth.sendSignedTransaction(getSignedTx(rawTransaction, config.coldAddress.privateKey))
        .once('confirmation', function (confirmationNumber, receipt) {
            Logger.info(`Transaction of sending ${web3.utils.fromWei(value.toString())} ETH to the address ` +
                `${watchingAddress.address} as gas completed with data: ${JSON.stringify(receipt)}`);
            sendTokensToTheColdAddress(watchingAddress, txData, gasPrice, estGas, data);
        }).once('error', function (error) {
        Logger.error(`Transaction of sending ${value} ETH to the address ` +
            `${watchingAddress.address} failed with error: ${JSON.stringify(error)}`);
    });

}

/**
 * Function for the send received ETH from the watching address to the cold address.
 * Cold address will receive total of received ETH minus gas for the transaction.
 * @param watchingAddress - watching address with a ETH
 * @param txData - data from watching api
 */
async function sendEthToTheColdAddress(watchingAddress, txData) {
    const gasPrice = await web3.eth.getGasPrice();
    const value = web3.utils.toWei(txData.value.toString()) - gasPrice * config.blockchain.gasLimit;
    const rawTransaction = {
        "from": watchingAddress.address,
        "nonce": web3.utils.numberToHex(await web3.eth.getTransactionCount(watchingAddress.address)),
        "gasPrice": web3.utils.numberToHex(gasPrice),
        "gasLimit": web3.utils.numberToHex(config.blockchain.gasLimit),
        "to": config.coldAddress.address,
        "value": web3.utils.numberToHex(value)
    };

    Logger.info(`Sending ${web3.utils.fromWei(value.toString())} ETH to the address ${watchingAddress.address}`);
    web3.eth.sendSignedTransaction(getSignedTx(rawTransaction, watchingAddress.privateKey.substring(2)))
        .once('confirmation', function (confirmationNumber, receipt) {
            Logger.info(`Transaction of sending ${web3.utils.fromWei(value.toString())} eth to the address ` +
                `${watchingAddress.address} completed with data: ${JSON.stringify(receipt)}`);
            Integrations.toConsole(watchingAddress.changeTo, txData.value, "ETH",
                txData.from, '0x0000000000000000000000000000000000000000');
        }).once('error', function (error) {
        Logger.error(`Transaction of sending ${web3.utils.fromWei(value.toString())} ETH to the address ` +
            `${watchingAddress.address} failed with error: ${JSON.stringify(error)}`);
    });

}

/**
 * Function for sending tokens from the watching address to the cold address.
 * data, gasPrice and gasLimit providing by parameters cause thay are already calculated at the depositAddressWithGas function
 * @param watchingAddress - watching address which contain received tokens
 * @param txData - data from watching api
 * @param gasPrice - gasPrice for transfer
 * @param gasLimit - gasPrice for transfer
 * @param data - ERC20 token transfer data
 */
async function sendTokensToTheColdAddress(watchingAddress, txData, gasPrice, gasLimit, data) {
    const rawTransaction = {
        "from": watchingAddress.address,
        "nonce": web3.utils.numberToHex(await web3.eth.getTransactionCount(watchingAddress.address)),
        "gasPrice": web3.utils.numberToHex(gasPrice),
        "gasLimit": web3.utils.numberToHex(gasLimit),
        "to": txData.contract,
        "value": "0x00",
        "data": data
    };

    Logger.info(`Sending ${txData.value} ${txData.token.symbol} to the cold address ` +
        `${config.coldAddress.address} from the address ${watchingAddress.address}`);
    web3.eth.sendSignedTransaction(getSignedTx(rawTransaction, watchingAddress.privateKey.substring(2)))
        .once('confirmation', function (confirmationNumber, receipt) {
            Logger.info(`Transaction of sending ${txData.value} ${txData.token.symbol} to the cold address ` +
                `${config.coldAddress.address} completed with data: ${JSON.stringify(receipt)}`);
            Integrations.toConsole(watchingAddress.changeTo, txData.value, txData.token.symbol, txData.from, txData.contract);
        }).once('error', function (error) {
        Logger.error(`Transaction of sending ${txData.value} ${txData.token.symbol} to the cold address ` +
            `${config.coldAddress.address} failed with error: ${JSON.stringify(error)}`);
    });
}

/**
 *
 * @param rawTransaction - unsigned ETH transaction data
 * @param pk - private key of the ETH address
 * @returns {string} - signed transaction, ready for sending
 */
function getSignedTx(rawTransaction, pk) {
    let privateKey = new Buffer.from(pk, 'hex');
    let tx = new Tx(rawTransaction, {chain: config.monitor.network, hardfork});
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    return '0x' + serializedTx.toString('hex');
}

/**
 * Function for checking incoming transaction value.
 * Will return true if value of transaction greater than current gas price
 * Will return false if value of transaction greater less current gas price
 * We need it for the understanding should we change ETH or ignore the transaction
 * @param value - value of the ETH transaction
 * @returns {Promise<boolean>} - result of the comparison
 */
async function isValueGreaterThanGasFee(value) {
    const gasPrice = await web3.eth.getGasPrice();
    return (web3.utils.toWei(value.toString())) > gasPrice * config.blockchain.gasLimit;
}

/**
 * Function for creating new ethereum address
 * @returns {Promise<any>} - ethereum address with private key
 */
async function createNewAddress() {
    let newAddress = await web3.eth.accounts.create()
    newAddress.address = newAddress.address.toLowerCase();
    return newAddress;
}

module.exports = {
    createNewAddress, sendEthToTheColdAddress, depositAddressWithGas, isValueGreaterThanGasFee
}