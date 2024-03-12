exports.up = (knex) => {
  return knex.schema.alterTable("adc-snaps", (table) => {
    table.string("notes");
  });
};

exports.down = (knex) => {
  return knex.schema.alterTable("adc-snaps", (table) => {
    table.dropColumn("notes");
  });
};
