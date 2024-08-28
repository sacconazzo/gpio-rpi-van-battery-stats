const knex = require("knex");
const connectionConfig = require("../../knexfile");

const conn = knex(connectionConfig);

conn.getSettingsVars = async () => {
  const vars = await conn("settings");

  return vars.reduce((o, e) => {
    o[e.key] = Number(e.value);
    return o;
  }, {});
};

conn.realTime = async () => {
  const [realtime] = await conn.raw(
    `SELECT\
    CONVERT_TZ(timestamp, 'UTC', '${process.env.DB_TIMEZONE}') as timestamp,\
    round(bm_voltage, 2) AS bmV,\
    round(b1_voltage, 2) AS b1V,\
    round(b2_voltage, 2) AS b2V,\
    round(b1_current, 1) AS b1A,\
    round(b2_current, 1) AS b2A,\
    round(temperature, 2) AS temp\
  FROM\
  \`battery-snaps\`\
  WHERE\
    timestamp> (NOW() - INTERVAL ${process.env.REALTIME_MINUTES} MINUTE)\
    and b1_voltage > 9\
    and b2_voltage > 9\
    and bm_voltage > 9\
  ORDER BY\
    id ASC;`
    // LIMIT 500;
  );
  return realtime;
};

conn.dayWeek = async () => {
  const [dayweek] = await conn.raw(
    `SELECT\
      date(CONVERT_TZ(timestamp, 'UTC', '${process.env.DB_TIMEZONE}')) AS day,\
      round(avg(bm_voltage), 2) bmV,\
      round(min(bm_voltage), 2) bmVmin,\
      round(max(bm_voltage), 2) bmVmax,\
      round(avg(b1_voltage), 2) b1V,\
      round(min(b1_voltage), 2) b1Vmin,\
      round(max(b1_voltage), 2) b1Vmax,\
      round(avg(b2_voltage), 2) b2V,\
      round(min(b2_voltage), 2) b2Vmin,\
      round(max(b2_voltage), 2) b2Vmax,\
      round(sum(b1_current * coeff), 1) AS b1Ah,\
      round(sum(b2_current * coeff), 1) AS b2Ah,\
      round(sum(b1_current * coeff * b1_voltage), 1) AS b1Wh,\
      round(sum(b2_current * coeff * b2_voltage), 1) AS b2Wh,\
      round(avg(temperature), 2) temp,\
      round(min(temperature), 2) tempMin,\
      round(max(temperature), 2) tempMax\
    FROM\
      \`battery-snaps\`\
    WHERE\
      date(timestamp)> (NOW() - INTERVAL 14 DAY)\
      and b1_voltage > 9\
      and b2_voltage > 9\
      and bm_voltage > 9\
    GROUP BY\
      day;`
  );
  return dayweek;
};

module.exports = conn;
