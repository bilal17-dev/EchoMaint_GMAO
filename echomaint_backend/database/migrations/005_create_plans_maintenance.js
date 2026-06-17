/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('plans_maintenance', (table) => {
    // 1. Clé primaire corrigée pour MySQL/XAMPP
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    // 2. Clé étrangère bien typée vers equipements
    table.uuid('equipement_id').notNullable()
      .references('id').inTable('equipements')
      .onDelete('RESTRICT'); // Sécurité : impossible de supprimer l'équipement s'il a un plan actif
    
    // 3. Infos du plan (avec types et contraintes)
    table.string('label', 200).notNullable();
    table.integer('periodicite_jours').notNullable();
    table.json('gamme_taches').nullable();
    table.boolean('actif').notNullable().defaultTo(true);
    table.date('derniere_generation').nullable();
    
    // 4. Suivi temporel
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('plans_maintenance');
};