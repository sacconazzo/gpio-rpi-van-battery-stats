const knex = require("knex");
const connectionConfig = require("../knexfile");

const db = knex(connectionConfig);

module.exports = db;
