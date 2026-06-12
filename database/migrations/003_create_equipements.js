exports.up = function(knex) {
  return knex.schema.createTable('equipements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code_inventaire').notNullable().unique(); // RG-01
    table.string('nom').notNullable();
    table.enum('categorie', ['technique', 'informatique', 'autre']).notNullable();
    table.uuid('batiment_id').references('id').inTable('batiments').onDelete('CASCADE');
    table.date('date_acquisition').notNullable();
    table.enum('statut', ['en_service', 'en_panne', 'en_maintenance', 'hors_service']).defaultTo('en_service');
    table.integer('periodicite_preventive_jours').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('equipements');
};