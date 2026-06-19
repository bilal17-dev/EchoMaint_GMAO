/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('batiments', (table) => {
    // Clé primaire UUID
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    // Champs obligatoires
    table.string('nom').notNullable();
    table.string('adresse').notNullable();
    
    // Champs optionnels (NULL autorisés comme dans PHPMyAdmin)
    table.string('ville').nullable();
    table.text('description').nullable();
    
    // Clé étrangère
    table.uuid('client_id').references('id').inTable('users').onDelete('SET NULL');
    
    // Timestamps
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('batiments');
};