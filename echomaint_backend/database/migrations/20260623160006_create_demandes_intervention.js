exports.up = function(knex) {
  return knex.schema.createTable('demandes_intervention', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('client_id').references('id').inTable('clients');
    table.uuid('equipement_id').references('id').inTable('equipements');
    table.string('titre');
    table.text('description');
    table.string('priorite');
    table.enu('statut', ['ouverte', 'traitee', 'rejetee']);
    table.uuid('intervention_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) { return knex.schema.dropTableIfExists('demandes_intervention'); };