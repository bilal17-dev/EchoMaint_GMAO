/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('nom', 100).notNullable();
    table.string('prenom', 100).notNullable();
    table.string('email', 150).notNullable().unique();
    table.string('mot_de_passe', 255).notNullable();
    table.enum('role', ['admin', 'technicien', 'client']).notNullable();
    
    // Clé étrangère vers clients (bien présente et nullable)
    table.uuid('id_client')
      .nullable()
      .references('id')
      .inTable('clients')
      .onDelete('SET NULL');
    
    table.enum('langue', ['fr', 'en']).notNullable().defaultTo('fr');
    table.boolean('actif').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};