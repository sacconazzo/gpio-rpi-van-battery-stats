exports.up = (knex) => {
  return knex.schema.createTable("adc-snaps", (table) => {
    table.increments("id").primary();
    table.timestamp("timestamp").notNullable().defaultTo(knex.fn.now());
    table.float("ch0", 8, 7);
    table.float("ch1", 8, 7);
    table.float("ch2", 8, 7);
    table.float("ch3", 8, 7);
    table.float("ch4", 8, 7);
    table.float("ch5", 8, 7);
    table.float("ch6", 8, 7);
    table.float("ch7", 8, 7);
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists("adc-snaps");
