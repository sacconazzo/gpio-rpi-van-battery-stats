exports.up = (knex) => {
  return knex.schema.createTable("settings", (table) => {
    table.increments("id").primary();
    table.string("key", 20).unique().notNullable();
    table.string("value", 20).notNullable();
    table.string("name", 20);
    table.string("notes");
  });
};

exports.down = (knex) => knex.schema.dropTableIfExists("settings");
