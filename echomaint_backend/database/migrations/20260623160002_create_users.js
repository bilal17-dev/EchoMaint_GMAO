/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('nom');
    table.string('prenom');
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.enu('role', ['admin', 'technicien', 'client']).notNullable();
    table.enu('langue', ['fr', 'en']).defaultTo('fr');
    table.boolean('actif').defaultTo(true);
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};