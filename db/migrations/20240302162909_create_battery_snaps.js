exports.up = (knex) => {
  return knex.schema.createTable("battery-snaps", (table) => {
    table.increments("id").primary();
    table.timestamp("timestamp").notNullable().defaultTo(knex.fn.now());
    table.float("bm_voltage", 10, 6);
    table.float("b1_voltage", 10, 6);
    table.float("b2_voltage", 10, 6);
    table.float("b1_current", 10, 6);
    table.float("b2_current", 10, 6);
    table.float("coeff", 10, 7).notNullable();
    table.float("temperature", 10, 6);
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists("battery-snaps");
