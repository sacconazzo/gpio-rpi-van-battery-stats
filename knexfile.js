require("dotenv").config();

module.exports = {
  client: "mysql",
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: process.env.DB_TIMEZONE,
  },
  migrations: {
    directory: __dirname + "/db/migrations",
  },
  seeds: {
    directory: __dirname + "/db/seeds",
  },
};
