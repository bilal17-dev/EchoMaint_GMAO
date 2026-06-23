exports.up = function(knex) {
  return knex.schema.createTable('plans_maintenance', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('equipement_id').references('id').inTable('equipements');
    table.string('label');
    table.integer('periodicite_jours');
    table.json('gamme_taches');
    table.boolean('actif').defaultTo(true);
    table.date('derniere_generation');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('plans_maintenance'); };