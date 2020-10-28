const config = require('../config.json');

/**
 * Simple function for getting rates from the config file. You can implement any complex logic here.
 * Also you can add support of limits or any other logic relative to your exchange.
 * @param to - ETH address for the token or 0x0000000000000000000000000000000000000000 for Ethereum for changing to
 * @param from - ETH address for the token or 0x0000000000000000000000000000000000000000 for Ethereum for changing from
 * @returns {*|number|bigint} - rate from the config
 */
function getRate(to, from) {
    return config.rates.find(rate => rate.to.toLowerCase() === to &&
        rate.from.toLowerCase() === from);
}

module.exports = {
    getRate
}