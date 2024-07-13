const knex = require("knex");
const connectionConfig = require("../../knexfile");

const conn = knex(connectionConfig);

const getSettingsVars = async () => {
  const vars = await conn("settings");

  return vars.reduce((o, e) => {
    o[e.key] = Number(e.value);
    return o;
  }, {});
};

module.exports = {
  conn,
  getSettingsVars,
};
