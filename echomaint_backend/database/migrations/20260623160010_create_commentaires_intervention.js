exports.up = function(knex) {
  return knex.schema.createTable('commentaires_intervention', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('intervention_id').references('id').inTable('interventions');
    table.uuid('user_id').references('id').inTable('users');
    table.text('contenu');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) { return knex.schema.dropTableIfExists('commentaires_intervention'); };