const Rates = require('./rates');

/**
 * Function to display exchange information to the console log. You can implement any type of integration for
 * notifying your admins.
 * @param changeTo - address of a token or Ethereum which will be send to a user
 * @param value - value of tokens or ETH which will be send to a user
 * @param token - name of tokens or ETH which will be send to a user
 * @param addressFrom - ethereum user address for sending tokens or ETH
 * @param contract - address of a token or Ethereum which user sent to us
 */
function toConsole(changeTo, value, token, addressFrom, contract) {
    console.log(`${value} ${token} tokens received from address ${addressFrom}. ` +
        `Please send ${value * Rates.getRate(changeTo, contract).rate} of ${contract} to the address ${addressFrom}`);
}

module.exports = {
    toConsole
}