/**
 * Cette migration crée la table "equipements".
 * C'est le modèle v2.1 : reference (pas code_inventaire), date_installation (pas date_acquisition),
 * statut simplifié à 3 valeurs, et un soft delete avec deleted_at.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('equipements', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());

    // Bâtiment dans lequel se trouve l'équipement
    // onDelete CASCADE : si le bâtiment est supprimé, ses équipements le sont aussi
    table.uuid('batiment_id')
      .notNullable()
      .references('id')
      .inTable('batiments')
      .onDelete('CASCADE');

    table.string('nom', 150).notNullable();

    // Référence technique de l'équipement (ex: CLIM-001)
    // RG-REF-01 : doit être unique PAR BATIMENT (vérifié dans le code du controller, pas ici,
    // car deux équipements de deux bâtiments différents peuvent avoir la même référence)
    table.string('reference', 100).notNullable();

    table.string('type', 100).nullable();
    table.string('marque', 100).nullable();
    table.string('modele', 100).nullable();
    table.string('numero_serie', 100).nullable();

    // RG-REF-04 : cette date ne peut pas être dans le futur (vérifié côté code)
    table.date('date_installation').nullable();

    // Statut simplifié du modèle v2.1
    table.enum('statut', ['actif', 'en_panne', 'hors_service']).notNullable().defaultTo('actif');

    table.text('description').nullable();

    // Soft delete : quand on "supprime" un équipement, on remplit cette colonne
    // au lieu de vraiment effacer la ligne. Ça garde une trace pour l'historique.
    table.timestamp('deleted_at').nullable();

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