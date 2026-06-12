exports.up = function(knex) {
  return knex.schema.createTable('photo_interventions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('url').notNullable();
    table.enum('type_cliche', ['avant', 'apres']).notNullable();
    table.uuid('intervention_id').references('id').inTable('interventions').onDelete('CASCADE');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('photo_interventions');
};