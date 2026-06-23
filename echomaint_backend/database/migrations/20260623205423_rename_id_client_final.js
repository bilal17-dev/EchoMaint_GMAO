/**
 * @param { import("knex").knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // On commence par un return global pour que Knex attende la fin de toute la chaîne
  return knex.schema.alterTable('users', (table) => {
    table.dropForeign('client_id');
    table.renameColumn('client_id', 'id_client');
  }).then(() => {
    return knex.schema.alterTable('users', (table) => {
      table.uuid('id_client').nullable().alter();
      table.foreign('id_client').references('id').inTable('clients').onDelete('SET NULL');
    });
  });
};

/**
 * @param { import("knex").knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropForeign('id_client');
    table.renameColumn('id_client', 'client_id');
  }).then(() => {
    return knex.schema.alterTable('users', (table) => {
      table.foreign('client_id').references('id').inTable('clients').onDelete('SET NULL');
    });
  });
};