exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.uuid('client_id').references('id').inTable('clients').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('client_id');
  });
};