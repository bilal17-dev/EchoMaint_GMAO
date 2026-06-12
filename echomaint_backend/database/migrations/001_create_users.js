/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    // Utilisation de knex.fn.uuid() pour être compatible avec MySQL/XAMPP
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('nom').notNullable();
    table.string('prenom').notNullable();
    table.string('email').notNullable().unique();
    table.string('mot_de_passe').notNullable();
    table.enum('role', ['admin', 'technicien', 'client']).notNullable();
    table.timestamps(true, true); // Crée automatiquement created_at et updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};