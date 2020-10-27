const Web3 = require('web3');
const config = require('../config.json');
const Tx = require('ethereumjs-tx').Transaction;
const fs = require('fs');
const web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.networkUrl));
const Logger = require('./logger').logger;
const Integrations = require('./integrations');
const hardfork = "istanbul";

async function depositAddressWithGas(newAddress, txData){
    const gasPrice = await web3.eth.getGasPrice();
    const abi = JSON.parse(fs.readFileSync('abi.json', 'utf-8'));
    const contract = new web3.eth.Contract(abi, txData.contract);
    const data = contract.methods.transfer(config.coldAddress.address, txData.rawValue.toString()).encodeABI();
    const estGas =  (await web3.eth.estimateGas(  {
        "from": newAddress.address,
        "nonce": await web3.eth.getTransactionCount(newAddress.address),
        "gasPrice": gasPrice,
        "to": txData.contract,
        "value": "0x00",
        "data": data
    })) - config.blockchain.gasRefund;

    const value = gasPrice*estGas;
    const rawTransaction = {
        "from": config.coldAddress.address,
        "nonce": web3.utils.numberToHex(await web3.eth.getTransactionCount(config.coldAddress.address)),
        "gasPrice": web3.utils.numberToHex(gasPrice),
        "gasLimit": web3.utils.numberToHex(config.blockchain.gasLimit),
        "to": newAddress.address,
        "value": web3.utils.numberToHex(value)
    };

    Logger.info(`Sending ${web3.utils.fromWei(value.toString())} ETH to the address ${newAddress.address} as gas`);
    web3.eth.sendSignedTransaction(getSignedTx(rawTransaction, config.coldAddress.privateKey))
        .once('confirmation', function (confirmationNumber, receipt) {
            Logger.info(`Transaction of sending ${web3.utils.fromWei(value.toString())} ETH to the address `+
                `${newAddress.address} as gas completed with data: ${JSON.stringify(receipt)}`);
            sendTokensToTheColdAddress(newAddress, txData, gasPrice, estGas, data);
        }).once('error', function (error) {
        Logger.error(`Transaction of sending ${value} ETH to the address `+
            `${newAddress.address} failed with error: ${JSON.stringify(error)}`);
    });

}

function getSignedTx(rawTransaction, pk){
    let privateKey = new Buffer.from(pk, 'hex');
    let tx = new Tx(rawTransaction,{chain:config.monitor.network, hardfork});
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    return '0x' + serializedTx.toString('hex');
}

async function isValueGreaterThanGasFee(value){
    const gasPrice = await web3.eth.getGasPrice();
    return (web3.utils.toWei(value.toString()))>gasPrice*config.blockchain.gasLimit;
}

async function sendEthToTheColdAddress(newAddress, txData){
    const gasPrice = await web3.eth.getGasPrice();
    const value = web3.utils.toWei(txData.value.toString())-gasPrice*config.blockchain.gasLimit;
    const rawTransaction = {
        "from": newAddress.address,
        "nonce": web3.utils.numberToHex(await web3.eth.getTransactionCount(newAddress.address)),
        "gasPrice": web3.utils.numberToHex(gasPrice),
        "gasLimit": web3.utils.numberToHex(config.blockchain.gasLimit),
        "to": config.coldAddress.address,
        "value": web3.utils.numberToHex(value)
    };

    Logger.info(`Sending ${web3.utils.fromWei(value.toString())} ETH to the address ${newAddress.address}`);
    web3.eth.sendSignedTransaction(getSignedTx(rawTransaction, newAddress.privateKey.substring(2)))
        .once('confirmation', function (confirmationNumber, receipt) {
            Logger.info(`Transaction of sending ${web3.utils.fromWei(value.toString())} eth to the address `+
                `${newAddress.address} completed with data: ${JSON.stringify(receipt)}`);
            Integrations.toConsole(newAddress.changeTo, txData.value, "ETH", txData.from, '0x0000000000000000000000000000000000000000');
        }).once('error', function (error) {
        Logger.error(`Transaction of sending ${web3.utils.fromWei(value.toString())} ETH to the address `+
            `${newAddress.address} failed with error: ${JSON.stringify(error)}`);
    });

}

async function sendTokensToTheColdAddress(newAddress, txData, gasPrice, gasLimit, data){
    const rawTransaction = {
        "from": newAddress.address,
        "nonce": web3.utils.numberToHex(await web3.eth.getTransactionCount(newAddress.address)),
        "gasPrice": web3.utils.numberToHex(gasPrice),
        "gasLimit": web3.utils.numberToHex(gasLimit),
        "to": txData.contract,
        "value": "0x00",
        "data": data
    };

    Logger.info(`Sending ${txData.value} ${txData.token.symbol} to the cold address ${config.coldAddress.address} from the address ${newAddress.address}`);
    web3.eth.sendSignedTransaction(getSignedTx(rawTransaction,newAddress.privateKey.substring(2)))
        .once('confirmation', function (confirmationNumber, receipt) {
            Logger.info(`Transaction of sending ${txData.value} ${txData.token.symbol} to the cold address `+
                `${config.coldAddress.address} completed with data: ${JSON.stringify(receipt)}`);
            Integrations.toConsole(newAddress.changeTo, txData.value, txData.token.symbol, txData.from, txData.contract);
        }).once('error', function (error) {
        Logger.error(`Transaction of sending ${txData.value} ${txData.token.symbol} to the cold address `+
            `${config.coldAddress.address} failed with error: ${JSON.stringify(error)}`);
    });
}

async function createNewAddress(){
    let newAddress = await web3.eth.accounts.create()
    newAddress.address=newAddress.address.toLowerCase();
    return newAddress;
}

module.exports ={
    createNewAddress,sendEthToTheColdAddress,depositAddressWithGas, isValueGreaterThanGasFee
}