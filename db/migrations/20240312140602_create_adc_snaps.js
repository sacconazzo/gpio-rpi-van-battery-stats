exports.up = (knex) => {
  return knex.schema.createTable("adc-snaps", (table) => {
    table.increments("id").primary();
    table.timestamp("timestamp").notNullable().defaultTo(knex.fn.now());
    table.float("signal0", 8, 7);
    table.float("signal1", 8, 7);
    table.float("signal2", 8, 7);
    table.float("signal3", 8, 7);
    table.float("signal4", 8, 7);
    table.float("signal5", 8, 7);
    table.float("signal6", 8, 7);
    table.float("signal7", 8, 7);
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists("adc-snaps");
