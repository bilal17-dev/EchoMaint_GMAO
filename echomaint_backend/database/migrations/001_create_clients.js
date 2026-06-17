/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('nom', 150).notNullable();
    table.string('adresse', 255).nullable();
    table.string('telephone', 50).nullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('clients');
};