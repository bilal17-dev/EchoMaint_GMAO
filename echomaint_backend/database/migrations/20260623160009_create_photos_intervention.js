exports.up = function(knex) {
  return knex.schema.createTable('photos_intervention', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('intervention_id').references('id').inTable('interventions');
    table.enu('type_photo', ['avant', 'apres']);
    table.string('chemin_fichier');
    table.string('nom_original');
    table.integer('taille_octets');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) { return knex.schema.dropTableIfExists('photos_intervention'); };