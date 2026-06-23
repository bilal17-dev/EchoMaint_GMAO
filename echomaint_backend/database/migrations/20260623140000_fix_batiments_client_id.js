exports.up = function(knex) {
  return knex.schema.table('batiments', function(table) {
    // 1. On supprime l'ancienne contrainte erronée
    table.dropForeign('client_id');
    // 2. On ajoute la bonne contrainte
    table.foreign('client_id').references('id').inTable('clients').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  // Le retour arrière pour annuler
  return knex.schema.table('batiments', function(table) {
    table.dropForeign('client_id');
    table.foreign('client_id').references('id').inTable('users').onDelete('SET NULL');
  });
};