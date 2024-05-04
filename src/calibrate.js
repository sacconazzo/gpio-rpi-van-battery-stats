const db = require("./db");

const calibrate = async ({ force = true, tentative = 1 } = {}) => {
  if (force) {
    const [[spread]] = await db.raw(
      `select\
        min(b.b1_current) as A1_MIN,\
        min(b.b2_current) as A2_MIN,\
        max(b.b1_current) as A1_MAX,\
        max(b.b2_current) as A2_MAX\
        from\
          \`battery-snaps\` b\
        join \`adc-snaps\` a on\
          a.timestamp = b.timestamp\
        where\
          a.timestamp > (NOW() - INTERVAL 15 MINUTE);`
    );

    const spreadA1 = spread.A1_MAX - spread.A1_MIN;
    const spreadA2 = spread.A2_MAX - spread.A2_MIN;

    if (spreadA1 > 0.5 || spreadA2 > 0.5) {
      console.log(
        `Current sensor recalibrate: not stabile (${spreadA1},${spreadA2}), tentative ${tentative}`
      );
      await new Promise((r) => setTimeout(() => r(), 60000)); // wait 1 min
      return calibrate({
        force: force && tentative <= 24,
        tentative: tentative + 1,
      });
    }
  }

  const [[settings]] = await db.raw(
    `select\
    count(*) as snaps,
    truncate(avg(a.ch5), 4) as OFFSET_A1,\
    truncate(avg(a.ch6), 4) as OFFSET_A2,\
    avg(b.b1_current) as A1,\
    avg(b.b2_current) as A2,\
    round(avg(b.temperature), 2) as TEMPERATURE\
    from\
      \`battery-snaps\` b\
    join \`adc-snaps\` a on\
      a.timestamp = b.timestamp\
    where\
      a.timestamp > (NOW() - INTERVAL ${force ? "3 MINUTE" : "1 HOUR"})\
      ${
        force
          ? ";"
          : "and b1_current < 0.3\
             and b1_current > -0.3\
             and b2_current < 0.3\
             and b2_current > -0.3\
             HAVING\
             snaps > 10;"
      }`
  );

  console.log(`Current sensor recalibrate: ${JSON.stringify(settings)}`);
  if (!settings) return;

  await db("settings")
    .update({ value: String(settings.OFFSET_A1) })
    .where({ key: "OFFSET_A1" });
  await db("settings")
    .update({ value: String(settings.OFFSET_A2) })
    .where({ key: "OFFSET_A2" });
  await db("settings")
    .update({
      value: String(settings.TEMPERATURE),
      notes: new Date().toISOString(),
    })
    .where({ key: "TREF_A1" });
  await db("settings")
    .update({
      value: String(settings.TEMPERATURE),
      notes: new Date().toISOString(),
    })
    .where({ key: "TREF_A2" });

  return settings;
};

module.exports = calibrate;
