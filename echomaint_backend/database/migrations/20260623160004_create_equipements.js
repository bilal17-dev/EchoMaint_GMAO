exports.up = function(knex) {
  return knex.schema.createTable('equipements', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('batiment_id').references('id').inTable('batiments');
    table.string('nom').notNullable();
    table.string('reference');
    table.string('type');
    table.string('marque');
    table.string('modele');
    table.string('numero_serie');
    table.date('date_installation');
    table.enu('statut', ['actif', 'en_panne', 'hors_service']);
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};
exports.down = function(knex) { return knex.schema.dropTableIfExists('equipements'); };