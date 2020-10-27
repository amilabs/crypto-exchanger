const config = require('../config.json');
const Rates = require('./rates');

function toConsole(changeTo, value, token, addressFrom, contract){
    console.log(`${value} ${token} tokens received from address ${addressFrom}. `+
        `Please send ${Rates.getRate(changeTo, contract)} to the address ${addressFrom}`);
}

module.exports ={
    toConsole
}