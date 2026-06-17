/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('equipements', (table) => {
    // 1. Clé primaire compatible MySQL/XAMPP
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    // 2. Identifiants et caractéristiques (avec tailles optimisées)
    table.string('code_inventaire', 50).notNullable().unique(); // Exemple : RG-01
    table.string('nom', 150).notNullable();
    table.enum('categorie', ['technique', 'informatique', 'autre']).notNullable();
    
    // 3. Clé étrangère vers la table batiments
    table.uuid('batiment_id')
      .notNullable() // Un équipement se trouve obligatoirement dans un bâtiment
      .references('id')
      .inTable('batiments')
      .onDelete('CASCADE'); // Supprime les équipements si le bâtiment est supprimé
    
    // 4. Suivi et maintenance
    table.date('date_acquisition').notNullable();
    table.enum('statut', ['en_service', 'en_panne', 'en_maintenance', 'hors_service']).defaultTo('en_service');
    table.integer('periodicite_preventive_jours').notNullable();
    
    // 5. Timestamps de suivi
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('equipements');
};