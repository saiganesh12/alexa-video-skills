const logger = require('../lib/logger');
const response = require('../lib/response');
const Activation = require('../lib/Activation');

const post = ({ body }, context, callback) => Promise.resolve()
  .then(() => new Activation(JSON.parse(body)).save())
  .then((data) => {
    logger.log('Activation created: ', data);
    return callback(null, response(201, { data }));
  })
  .catch((err) => {
    logger.warn('Failed to create activation: ', err);

    if (err instanceof Activation.InvalidError) {
      return callback(null, response(422, {
        errors: [].concat(err.validationErrors),
      }));
    }

    return callback(null, response(500, {
      errors: [err.message],
    }));
  });

const get = ({ pathParameters: { idmcode } }, context, callback) => Activation.load(idmcode)
  .then((data) => {
    // Treat expired activations as not found.
    if (data.ttl * 1000 < Date.now()) {
      throw new Activation.ExpiredError(`The activation with idmcode "${idmcode}" is expired.`);
    }

    logger.log('Activation retrieved: ', data);

    return callback(null, response(200, { data }));
  })
  .catch((err) => {
    logger.warn('Failed to retrieve activation: ', err);

    let code = 500;
    if (err instanceof Activation.NotFoundError) {
      code = 404;
    }
    else if (err instanceof Activation.ExpiredError) {
      code = 410;
    }

    return callback(null, response(code, {
      errors: [err.message],
    }));
  });

module.exports = { post, get };
