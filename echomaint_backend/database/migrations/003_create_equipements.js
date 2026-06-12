/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('equipements', (table) => {
    // Correction MySQL/XAMPP
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('code_inventaire').notNullable().unique(); // Exemple : RG-01
    table.string('nom').notNullable();
    table.enum('categorie', ['technique', 'informatique', 'autre']).notNullable();
    table.uuid('batiment_id').references('id').inTable('batiments').onDelete('CASCADE');
    table.date('date_acquisition').notNullable();
    table.enum('statut', ['en_service', 'en_panne', 'en_maintenance', 'hors_service']).defaultTo('en_service');
    table.integer('periodicite_preventive_jours').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('equipements');
};