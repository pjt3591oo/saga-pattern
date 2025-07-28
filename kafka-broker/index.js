const Producer = require('./producer');
const Consumer = require('./consumer');
const config = require('./config');

module.exports = {
  Producer,
  Consumer,
  config,
  topics: config.topics,
  consumerGroups: config.consumerGroups
};