const config = require('config');
const logger = require('park-logger');

const activeLog = config.get('logger.activeLog');
logger.init(config.get(`logger.${activeLog}`));

module.exports = logger;
