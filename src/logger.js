const {createLogger, format, transports,} = require('winston');
/**
 * Main logger for the service. You can add any logic here or change logging with simple console.log().
 * @type {winston.Logger}
 */
const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.prettyPrint(),
        format.splat(),
        format.simple()
    ),
    transports: [
        new transports.Console()
    ]
});

module.exports = {
    logger
}