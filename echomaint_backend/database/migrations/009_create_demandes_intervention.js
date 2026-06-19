// Une demande d'intervention (DI) = une entreprise cliente signale un problème
exports.up = function(knex) {
  return knex.schema.createTable('demandes_intervention', function(table) {
    table.uuid('id').primary();
    
    // 1. L'entreprise cliente propriétaire de l'équipement (Vision de ton superviseur)
    table.uuid('client_id').notNullable()
      .references('id').inTable('clients')
      .onDelete('RESTRICT');
      
    // 2. L'équipement concerné
    table.uuid('equipement_id').notNullable()
      .references('id').inTable('equipements')
      .onDelete('RESTRICT');
    
    // 3. Informations textuelles de la demande (CDC J4)
    table.string('titre', 200).notNullable();
    table.text('description').notNullable();
    
    table.enum('priorite', ['basse', 'normale', 'haute', 'urgente'])
      .notNullable().defaultTo('normale');
    
    // 4. Machine à états stricte (CDC v2.1)
    table.enum('statut', ['en_attente', 'validee', 'rejettee'])
      .notNullable().defaultTo('en_attente');
    
    // 5. Justification obligatoire en cas de refus de l'admin (CDC J4)
    table.text('motif_rejet').nullable();
    
    // 6. Lien historique vers l'OT si la demande est validée (CDC J4)
    table.uuid('intervention_id').nullable()
      .references('id').inTable('interventions')
      .onDelete('SET NULL');
    
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('demandes_intervention');
};