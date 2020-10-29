# Exchange real working example

This is an example of a real working example of a crypto exchange service implemented with Bulk API Monitor. 

## What this exchange doing

This exchange service can create a new ethereum address, then you can provide this address to a user.
Users can send some tokens or ETH to this address.
With help of the Bulk API Monitor library, we can receive information about this incoming transaction. 
In case of incoming funds are supports for the change in the config we start the process for sending funds to the cold address.
If incoming funds are ERC20 tokens we will deposit this address with gas and only after that we will send tokens to the cold address
If incoming funds are ETH we will send it to the cold address.
After receiving funds we will notify an admin that funds received, and he/she able to send expected tokens/ETH to the user.
 
### How to start

```sh
$ git clone git@github.com:amilabs/crypto-exchange.git
$ cd crypto-exchange/example
$ npm i
$ npm run-script start
```

Don't forget to change information about the cold address, bulk API key, and ethereum node URL at the config.json file.
