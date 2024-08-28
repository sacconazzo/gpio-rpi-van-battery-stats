const db = require("../db");
const ai = require("./ai");

const calibrate = async ({ force = true, tentative = 1, absorption } = {}) => {
  if (force) {
    const [[spread]] = await conn.raw(
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

    if (spreadA1 > 0.4 || spreadA2 > 0.4) {
      console.log(
        `Current sensor recalibrate: not stabile (${spreadA1},${spreadA2}), tentative ${tentative}`
      );
      await new Promise((r) => setTimeout(() => r(), 60000)); // wait 1 min
      return calibrate({
        force: force && tentative <= 24,
        tentative: tentative + 1,
        absorption,
      });
    }
  }

  const [[data]] = await conn.raw(
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

  console.log(`Current sensor recalibrate: ${JSON.stringify(data)}`);

  if (data && data.OFFSET_A1 > 0.2 && data.OFFSET_A2 > 0.2) {
    const vars = await db.getSettingsVars();

    const baseA = Number(absorption) || vars["IDLE_A"];
    const offsetBaseA1 = baseA / 2 / (vars["VREF"] * vars["COEFF_A1"]);
    const offsetBaseA2 = baseA / 2 / (vars["VREF"] * vars["COEFF_A2"]);

    data.OFFSET_A1 = (data.OFFSET_A1 + offsetBaseA1).toFixed(4);
    data.OFFSET_A2 = (data.OFFSET_A2 + offsetBaseA2).toFixed(4);

    await conn("settings")
      .update({ value: data.OFFSET_A1 })
      .where({ key: "OFFSET_A1" });
    await conn("settings")
      .update({ value: data.OFFSET_A2 })
      .where({ key: "OFFSET_A2" });

    await conn("calibrate-snaps").insert({
      temperature: data.TEMPERATURE,
      a1: data.OFFSET_A1,
      a2: data.OFFSET_A2,
      shift_a1: data.A1,
      shift_a2: data.A2,
    });

    return data;
  }
};

const calibrateAI = async () => {
  const data = await ai();

  console.log(`Current sensor recalibrate from AI: ${JSON.stringify(data)}`);

  if (data && data.OFFSET_A1 > 0.2 && data.OFFSET_A2 > 0.2) {
    await conn("settings")
      .update({ value: data.OFFSET_A1 })
      .where({ key: "OFFSET_A1" });
    await conn("settings")
      .update({ value: data.OFFSET_A2 })
      .where({ key: "OFFSET_A2" });

    await conn("calibrate-snaps").insert({
      temperature: data.TEMPERATURE,
      a1: data.OFFSET_A1,
      a2: data.OFFSET_A2,
    });

    return data;
  }
};

module.exports = { calibrate, calibrateAI };
