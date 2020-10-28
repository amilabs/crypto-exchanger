# Exchnage real working example

This is an example real working example of a crypto exchnage service implemented with Bulk API Monitor. 

## What this exchange doing

This exhange service can created a new ethereum address, then you can provide this address to a user.
User can send some tokens or ETH to this address.
With help of the Bulk API Monitor library we are able to receive information about this incoming transaction. 
In case of incoming funds are supports for the change in the config we start process for sending funds to the cold address.
If incoming funds are ERC20 tokens we will deposit this address with gas and only after that we will send tokens to the cold address
If incoming funds is ETH we will send it to the cold address.
After receiving funds we will notify an admin that funds received, and he/she able to send expected tokens/ETH to the user.
 
### How to start

```sh
$ git clone git@github.com:amilabs/crypto-exchange.git
$ cd crypto-exchange
$ npm i
$ npm run-script start
```

Don't forget to change information about cold address, bulk api key and ethreium node url at the config.json file.