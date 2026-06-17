/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('interventions', (table) => {
    // 1. Clé primaire corrigée pour MySQL/XAMPP
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    // 2. Clé étrangère vers equipements (Sécurisée en RESTRICT)
    table.uuid('equipement_id').notNullable()
      .references('id').inTable('equipements')
      .onDelete('RESTRICT');
    
    // 3. Enums et caractéristiques de l'intervention
    table.enum('type', ['preventif', 'curatif']).notNullable();
    table.enum('statut', ['planifiee', 'assignee', 'en_cours', 'terminee', 'annulee']).notNullable().defaultTo('planifiee');
    table.enum('priorite', ['basse', 'normale', 'haute', 'urgente']).notNullable().defaultTo('normale');
    
    table.string('titre', 200).notNullable();
    table.text('description').nullable();
    
    // 4. Clé étrangère vers le technicien (dans la table users)
    table.uuid('technicien_id').nullable()
      .references('id').inTable('users')
      .onDelete('SET NULL');
    
    // 5. Suivi des dates (Utilisation de dateTime ou datetime selon le dialecte Knex, les deux passent sur MySQL)
    table.dateTime('date_planifiee').nullable();
    table.dateTime('date_debut_reelle').nullable();
    table.dateTime('date_fin_reelle').nullable();
    
    // 6. Données de clôture et livrables
    table.text('commentaire_cloture').nullable();
    table.integer('duree_reelle_minutes').nullable();
    table.string('rapport_pdf_chemin', 255).nullable();
    
    // 7. Clé étrangère vers le plan de maintenance (nullable)
    table.uuid('plan_maintenance_id').nullable()
      .references('id').inTable('plans_maintenance')
      .onDelete('SET NULL');
    
    // 8. Lien vers la demande d'intervention (DI)
    table.uuid('demande_intervention_id').nullable();
    
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('interventions');
};