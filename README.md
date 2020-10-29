# Exchange example

This is a guide on how to implement easy ERC20 coins and Ethereum exchange with the client for the Bulk API Monitor. 

## Steps

  - Creating new eth address and sending it to a user
  - Watching this address for new ETH transactions of ERC20 transfers
  - Sending tokens to your cold address with filling address by the current gas price.
  - Sending ETH funds to your cold address
  - Stop watching for address
  - Notify the administrator that funds were received

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

Don't forget to stop watching a new address if will not work with it in the future.
```sh
monitorApp.unwatch();
```

So, now we can notify admin that tokens or ETH was sent to your cold address and the user able to receive expected funds regarding current exchange rates.

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
The function which returns ethereum address.
This address should be sent to a user for deposit tokens or Ethereum
 */
function createNewEthAddress(){
    // ...
}

/*
The function which will deposit the created address with gas.
We need it for sending received tokens from a user to the cold address of your exchange service.
 */
function depositNewAddressWithGas(){
    // ...
}

/*
The function which will send tokens from the created address to the cold address of your exchange service.
 */
function sendTokensFromNewAddressToTheColdAddress(){
    // ...
}

/*
The function which will send received ETH from a user to the cold address of your exchange service.
 */
function sendEthToTheColdAddress(){
    // ...
}

/*
Function for notifying the administrator of your exchange service that tokens or ETH received on your cold address.
Now administrator able to send user expected resources regarding current exchange rate.
 */
function notifyAdmin(){
    // ...
}
```


### Real working example 
A full real working example of a crypto exchange service can be found here: [link](https://github.com/amilabs/crypto-exchange/tree/main/example)
