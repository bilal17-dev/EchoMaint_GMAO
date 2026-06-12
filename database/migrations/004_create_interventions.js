exports.up = function(knex) {
  return knex.schema.createTable('interventions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('equipement_id').references('id').inTable('equipements').onDelete('CASCADE');
    table.enum('type', ['preventive', 'curative']).notNullable();
    table.enum('priorite', ['basse', 'moyenne', 'haute']).notNullable();
    table.enum('statut', ['a_planifier', 'planifie', 'en_cours', 'realise', 'annule']).defaultTo('a_planifier');
    table.uuid('technicien_id').references('id').inTable('users').onDelete('SET NULL');
    table.text('description').notNullable();
    table.dateTime('date_planifiee');
    table.dateTime('date_cloture');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('interventions');
};