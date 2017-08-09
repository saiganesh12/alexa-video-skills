const config = require('config');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved
const AJV = require('ajv');
const schema = require('../schema/activation.json');

const ajv = new AJV();
const defaultData = schema.required
  .reduce((data, prop) => Object.assign({ [prop]: null }, data), {});
const dynamo = new AWS.DynamoDB.DocumentClient({
  region: config.get('aws.region'),
});
const TableName = config.get('aws.dynamoDB.tableName');

// Activation-specific error classes.
class InvalidError extends Error {
  constructor(ajvErrors) {
    const errors = [].concat(ajvErrors);
    const message = errors.map(err => `The "${err.dataPath}" property ${err.message}`).join(', ');
    super(message);
    this.validationErrors = errors;
  }
}
class NotFoundError extends Error {}
class ExpiredError extends Error {}

class Activation {
  /**
   * Construct a valid Activation object.
   *
   * @param {Object} data
   *   The data object from which to construct the activation object. The
   *   properties "idmcode" and "acode" are required. Other properties may be
   *   present as defined by the activation schema.
   * @param {String} data.idmcode
   *   The IDM code for the activation user.
   * @param {String} data.acode
   *   The Adobe code for the activation user.
   *
   * @throws {Activation.InvalidError}
   *   Throws when validation fails.
   */
  constructor(data) {
    // Construct activation data by ensuring all expected properties exist.
    this.data = Object.assign({}, Activation.defaultData, data);
    this.validate();
  }

  /**
   * Validates an activation object.
   *
   * @throws {Activation.InvalidError}
   *   Throws when validation fails.
   */
  validate() {
    if (!Activation.ajv.validate(Activation.schema, this.data)) {
      throw new Activation.InvalidError(ajv.errors);
    }
    return this;
  }

  /**
   * Saves an activation record to DynamoDB.
   *
   * @return {Promise.<Object>}
   *   Promises the saved activation object data.
   */
  save() {
    const updated = parseInt(Date.now() / 1000, 10);
    const Item = Object.assign({
      // Set ttl to 30 minutes from now.
      ttl: updated + (30 * 60),
      updated,
    }, this.data);

    return dynamo.put({
      TableName,
      Item,
    }).promise()
      .then(() => Item);
  }

  /**
   * Load an activation record from DynamoDB.
   *
   * @param {String} idmcode
   *   The idmcode with which to load the activation record.
   *
   * @throws {Activation.NotFoundError}
   *   Throws if no activation object could be found.
   *
   * @return {Promise.<Object>}
   *   Promises an activation record from DynamoDB.
   */
  static load(idmcode) {
    return dynamo.get({
      TableName,
      Key: { idmcode },
    }).promise()
      .then(({ Item }) => {
        if (typeof Item === 'undefined') {
          throw new Activation.NotFoundError(`No activation with idmcode "${idmcode}" could be found.`);
        }
        return Item;
      });
  }

  /**
   * @property {Object} schema
   *   The ajv instance used for validating activation records against the
   *   schema.
   */
  static get ajv() {
    return ajv;
  }

  /**
   * @property {Object} schema
   *   An object containing the JSON Schema definition for activations.
   */
  static get schema() {
    return schema;
  }

  /**
   * @property {Object} defaultData
   *   An object containing all activation properties with a null value. See the
   *   activation schema for existing properties.
   */
  static get defaultData() {
    return defaultData;
  }

  /**
   * @property {function} InvalidError
   *   An error class distinguishing validation errors on activation objects.
   */
  static get InvalidError() {
    return InvalidError;
  }

  /**
   * @property {function} NotFoundError
   *   An error class distinguishing errors due to the inability to find an
   *   activation.
   */
  static get NotFoundError() {
    return NotFoundError;
  }

  /**
   * @property {function} NotFoundError
   *   An error class distinguishing errors due to the expiration of an
   *   activation.
   */
  static get ExpiredError() {
    return ExpiredError;
  }

  /**
   * @property {function} dynamo
   *   Expose the DynamoDB DocumentClient used for activation objects.
   */
  static get dynamo() {
    return dynamo;
  }
}

module.exports = Activation;
