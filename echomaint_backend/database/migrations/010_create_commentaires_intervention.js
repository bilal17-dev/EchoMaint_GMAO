exports.up = function(knex) {
  return knex.schema.createTable('commentaires_intervention', function(table) {
    table.uuid('id').primary();
    
    table.uuid('intervention_id').notNullable()
      .references('id').inTable('interventions')
      .onDelete('CASCADE');
    
    table.uuid('user_id').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT');
    
    table.text('contenu').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('commentaires_intervention');
};