/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('batiments', (table) => {
    table.string('ville').nullable();
    table.text('description').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('batiments', (table) => {
    table.dropColumn('ville');
    table.dropColumn('description');
  });
};

