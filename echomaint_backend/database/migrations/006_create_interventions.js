/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // ----------------------------------------------------------------
    // 1. CRÉATION DE LA TABLE PRINCIPALE : INTERVENTIONS
    // ----------------------------------------------------------------
    .createTable('interventions', (table) => {
      // Clé primaire sécurisée pour MySQL/XAMPP (générée côté backend)
      table.uuid('id').primary();
      
      // Clé étrangère vers equipements (Sécurisée en RESTRICT)
      table.uuid('equipement_id').notNullable()
        .references('id').inTable('equipements')
        .onDelete('RESTRICT');
      
      // Enums et caractéristiques de l'intervention conformes Roadmap v2.1
      table.enum('type', ['preventif', 'curatif']).notNullable();
      table.enum('statut', ['planifiee', 'assignee', 'en_cours', 'terminee', 'annulee']).notNullable().defaultTo('planifiee');
      table.enum('priorite', ['basse', 'normale', 'haute', 'urgente']).notNullable().defaultTo('normale');
      
      table.string('titre', 200).notNullable();
      table.text('description').nullable();
      
      // Clé étrangère vers le technicien (dans la table users)
      table.uuid('technicien_id').nullable()
        .references('id').inTable('users')
        .onDelete('SET NULL');
      
      // Suivi des dates (dateTime est parfait pour le pilote mysql2)
      table.dateTime('date_planifiee').nullable();
      table.dateTime('date_debut_reelle').nullable();
      table.dateTime('date_fin_reelle').nullable();
      
      // Données de clôture et livrables
      table.text('commentaire_cloture').nullable();
      table.integer('duree_reelle_minutes').nullable();
      table.string('rapport_pdf_chemin', 255).nullable();
      
      // Clé étrangère vers le plan de maintenance (nullable)
      table.uuid('plan_maintenance_id').nullable()
        .references('id').inTable('plans_maintenance')
        .onDelete('SET NULL');
      
      // Lien vers la demande d'intervention (DI) pour la Journée 4
      table.uuid('demande_intervention_id').nullable();
      
      table.timestamps(true, true);
    })
    
    // ----------------------------------------------------------------
    // 2. CRÉATION DE LA TABLE D'HISTORIQUE : REOUVERTURES_OT (Exigence v2.1)
    // ----------------------------------------------------------------
    .createTable('reouvertures_ot', (table) => {
      table.uuid('id').primary();
      
      // Lien vers l'intervention réouverte (Suppression en CASCADE si l'OT parent est supprimé)
      table.uuid('intervention_id').notNullable()
        .references('id').inTable('interventions')
        .onDelete('CASCADE');
        
      // Qui a réouvert ? (Lien vers l'administrateur)
      table.uuid('user_id').notNullable()
        .references('id').inTable('users')
        .onDelete('RESTRICT');
        
      table.text('motif').notNullable(); // Le motif de minimum 20 caractères validé par le contrôleur
      table.string('statut_precedent', 50).notNullable().defaultTo('terminee');
      
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Suppression dans l'ordre inverse des dépendances pour éviter les blocages de clés étrangères
  return knex.schema
    .dropTableIfExists('reouvertures_ot')
    .dropTableIfExists('interventions');
};