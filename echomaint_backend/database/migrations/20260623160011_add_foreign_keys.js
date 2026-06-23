exports.up = function(knex) {
  return knex.schema.alterTable('demandes_intervention', (table) => {
    table.foreign('intervention_id').references('id').inTable('interventions');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('demandes_intervention', (table) => {
    table.dropForeign('intervention_id');
  });
};