const Rates = require('./rates');

function toConsole(changeTo, value, token, addressFrom, contract){
    console.log(`${value} ${token} tokens received from address ${addressFrom}. `+
        `Please send ${value*Rates.getRate(changeTo, contract).rate} to the address ${addressFrom}`);
}
module.exports ={
    toConsole
}