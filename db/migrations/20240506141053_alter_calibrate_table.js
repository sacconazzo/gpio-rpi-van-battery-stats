exports.up = (knex) => {
  return knex.schema.alterTable("calibrate-snaps", (table) => {
    table.float("shift_a1", 10, 6);
    table.float("shift_a2", 10, 6);
  });
};

exports.down = (knex) => {
  return knex.schema.alterTable("calibrate-snaps", (table) => {
    table.dropColumn("shift_a1");
    table.dropColumn("shift_a2");
  });
};
