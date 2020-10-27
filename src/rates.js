const config = require('../config.json');

function getRate(to, from){
    return config.rates.find(rate => rate.to.toLowerCase() === to &&
        rate.from.toLowerCase() === from);
}

module.exports ={
    getRate
}