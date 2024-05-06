exports.up = (knex) => {
  return knex.schema.createTable("calibrate-snaps", (table) => {
    table.increments("id").primary();
    table.timestamp("timestamp").notNullable().defaultTo(knex.fn.now());
    table.float("a1", 8, 7);
    table.float("a2", 8, 7);
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists("calibrate-snaps");
