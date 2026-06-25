// Bug #4 — ajout de la colonne deleted_at pour activer le soft delete sur les équipements
exports.up = function(knex) {
  return knex.schema.alterTable('equipements', (table) => {
    table.timestamp('deleted_at').nullable().defaultTo(null);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('equipements', (table) => {
    table.dropColumn('deleted_at');
  });
};
