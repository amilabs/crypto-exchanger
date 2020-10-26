const config = require('../config.json');
function toConsole(changeTo, value, token, addressFrom, contract){
    console.log(`${value} ${token} tokens received from address ${addressFrom}. `+
        `Please send ${value*config.rates.find(rate=>rate.from.toLowerCase() === contract &&
            rate.to.toLowerCase() === changeTo).rate} to the address ${addressFrom}`);
}

module.exports ={
    toConsole
}