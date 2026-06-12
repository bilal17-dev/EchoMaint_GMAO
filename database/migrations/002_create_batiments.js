exports.up = function(knex) {
  return knex.schema.createTable('batiments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nom').notNullable();
    table.string('adresse').notNullable();
    table.uuid('client_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('batiments');
};