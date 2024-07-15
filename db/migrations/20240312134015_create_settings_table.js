exports.up = async (knex) => {
  await knex.schema.createTable("settings", (table) => {
    table.increments("id").primary();
    table.string("key", 20).unique().notNullable();
    table.string("value", 20).notNullable();
    table.string("name", 20);
    table.string("notes");
  });

  return knex("settings").insert([
    {
      key: "VREF",
      value: "5.10",
      name: "V ref.",
      notes: null,
    },
    {
      key: "INTERVAL",
      value: "20",
      name: "Sec. interval",
      notes: null,
    },
    {
      key: "COEFF_V0",
      value: "3.00",
      name: "Coeff. V divider",
      notes: "(R1 + R2) / R2",
    },
    {
      key: "COEFF_V1",
      value: "3.00",
      name: "Coeff. V divider",
      notes: "(R1 + R2) / R2",
    },
    {
      key: "COEFF_V2",
      value: "3.00",
      name: "Coeff. V divider",
      notes: "(R1 + R2) / R2",
    },
    {
      key: "TREF_A1",
      value: "25",
      name: "°C temp.",
      notes: null,
    },
    {
      key: "TREF_A2",
      value: "25",
      name: "°C temp.",
      notes: null,
    },
    {
      key: "OFFSET_A1",
      value: "0.5000",
      name: "Coeff. offset",
      notes: "def. 0.5",
    },
    {
      key: "OFFSET_A2",
      value: "0.5000",
      name: "Coeff. offset",
      notes: "def. 0.5",
    },
    {
      key: "COEFF_A1",
      value: "-33",
      name: "sensit. mV/A",
      notes: null,
    },
    {
      key: "COEFF_A2",
      value: "-33",
      name: "sensit. mV/A",
      notes: null,
    },
    {
      key: "DRIFT_A1",
      value: "0.000",
      name: "coeff. drift (exp)",
      notes: "y=OFFSET_A1+((temp-TREF_A1)*DRIFT_A1)^2",
    },
    {
      key: "DRIFT_A2",
      value: "0.000",
      name: "coeff. drift (exp)",
      notes: "y=OFFSET_A2+((temp-TREF_A2)*DRIFT_A2)^2",
    },
    {
      key: "IDLE_A",
      value: "0.2",
      name: "A idle",
      notes: "Idle current absorption",
    },
  ]);
};

exports.down = (knex) => knex.schema.dropTableIfExists("settings");
