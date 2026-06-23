exports.up = function(knex) {
  return knex.schema.createTable('batiments', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('client_id').references('id').inTable('clients');
    table.string('nom').notNullable();
    table.string('adresse').notNullable();
    table.string('ville');
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('batiments'); };