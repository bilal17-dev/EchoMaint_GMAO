// Une demande d'intervention (DI) = un client signale un problème
// L'admin peut ensuite la convertir en OT (ordre de travail)
exports.up = function(knex) {
  return knex.schema.createTable('demandes_intervention', function(table) {
    table.uuid('id').primary();
    
    table.uuid('client_id').notNullable()
      .references('id').inTable('clients')
      .onDelete('RESTRICT');
    
    table.uuid('equipement_id').notNullable()
      .references('id').inTable('equipements')
      .onDelete('RESTRICT');
    
    table.string('titre', 200).notNullable();
    table.text('description').notNullable();
    
    table.enum('priorite', ['basse', 'normale', 'haute', 'urgente'])
      .notNullable().defaultTo('normale');
    
    // ouverte = en attente, traitee = convertie en OT, rejetee = refusée
    table.enum('statut', ['ouverte', 'traitee', 'rejetee'])
      .notNullable().defaultTo('ouverte');
    
    // Si la DI a été convertie en OT, on garde le lien
    table.uuid('intervention_id').nullable()
      .references('id').inTable('interventions')
      .onDelete('SET NULL');
    
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('demandes_intervention');
};