# Exchnage example

This is a guide how to implement easy ERC20 coins and Ethereum exchange with the client for the Bulk API Monitor. 

## Steps

  - Creating new eth address and sending it to a user
  - Watching this address for new ETH transactions of ERC20 transfers
  - Sending tokens to your cold address with filling address by the current gas price.
  - Sending ETH funds to your cold address
  - Stop watching for address
  - Notify administrator that funds was received

### Installation

```sh
$ mkdir exchnage 
$ cd exchange
$ npm init
$ npm i --save eth-bulk-monitor-client-nodejs
```


### Development

Requiring of a MonitorApp:
```
const { MonitorApp } = require('eth-bulk-monitor-client-nodejs');
```

Initialization of new MonitorApp object with your api key:
```sh
const monitorApp = new MonitorApp("apiKey");
```

Creating a new ethereum address(easy to do with web3 library):
```sh
const newEthAddress = createNewEthAddress();
```

After providing new address to a user you should sign for transactions and operation for this address:
```sh
monitorApp.watch([
        newEthAddress,
    ],
    (data) => {
        ...
    });
```

After the receiving callback from the watch function we should understand is it token transfer or ETH transaction:
```sh
monitorApp.watch([
        newEthAddress,
    ],
    async (data) => {
        if (data.data.contract){
            // Here should be logic for a token transfer
            ...
        }else{
            // Here should be logic for a ETH transaction
            ...
        }
    });
```

For the token transfer we should deposit address with current gas price and only after that we able to send tokens to the cold address of your exchange service.
```sh
if (data.data.contract){
    depositNewAddressWithGas(newEthAddress);
    sendTokensFromNewAddressToTheColdAddress(yourColdAddress, newEthAddress, data.value);
}
```

In the case of receiving ETH we can send it to your cold address directly.
```sh
}else{
    sendEthToTheColdAddress(yourColdAddress, newEthAddress, data.value);
}
```

Don't forget stop watching of a new address if will not work with it in a future.
```sh
monitorApp.unwatch();
```

So, now we can notify admin that tokens or ETH was sent to your cold address and user able to receive expected funds regarding current exchange rates.

```sh
notifyAdmin();
```

### Final code
```sh
const {MonitorApp} = require('@timophey01/eth-bulk-monitor-client-nodejs');
const monitorApp = new MonitorApp("apiKey");

const newEthAddress = createNewEthAddress();

monitorApp.watch([
        newEthAddress,
    ],
    async (data) => {
        if (data.data.contract){
            depositNewAddressWithGas();
            sendTokensFromNewAddressToTheColdAddress();
        }else{
            sendEthToTheColdAddress();
        }
        monitorApp.unwatch();
        notifyAdmin();
    });

/*
Function which returns ethereum address.
This address should be send to a user for deposit tokens or Ethereum
 */
function createNewEthAddress(){
    // ...
}

/*
Function which will deposit created address with gas.
We need it for the sending received tokens from a user to the cold address of your exchange service.
 */
function depositNewAddressWithGas(){
    // ...
}

/*
Function which will send tokens from the created address to the cold address of your exchange service.
 */
function sendTokensFromNewAddressToTheColdAddress(){
    // ...
}

/*
Function which will send received ETH from a user to the cold address of your exchange service.
 */
function sendEthToTheColdAddress(){
    // ...
}

/*
Function for notifying administrator of your exchange service that tokens or ETH received on your cold address.
Now administrator able to send user expected resources regarding current exchange rate.
 */
function notifyAdmin(){
    // ...
}
```


### Real working example 
Full real working example of a crypto exchnage service can be found here: [link](https://github.com/amilabs/crypto-exchange/example)
