exports.up = function(knex) {
  return knex.schema.createTable('interventions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('equipement_id').references('id').inTable('equipements').onDelete('CASCADE');
    table.enu('type', ['preventif', 'curatif']);
    table.enu('statut', ['planifiee', 'assignee', 'en_cours', 'terminee', 'annulee']);
    table.enu('priorite', ['basse', 'normale', 'haute', 'urgente']);
    table.string('titre');
    table.text('description');
    table.uuid('technicien_id').nullable().references('id').inTable('users');
    
    // Dates et champs facultatifs rendus explicitement nullables
    table.timestamp('date_planifiee').nullable();
    table.timestamp('date_debut_reelle').nullable();
    table.timestamp('date_fin_reelle').nullable();
    
    table.text('commentaire_cloture').nullable();
    table.integer('duree_reelle_minutes').nullable();
    table.string('rapport_pdf_chemin').nullable();
    
    table.uuid('plan_maintenance_id').nullable().references('id').inTable('plans_maintenance');
    table.uuid('demande_intervention_id').nullable().references('id').inTable('demandes_intervention');
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('interventions');
};