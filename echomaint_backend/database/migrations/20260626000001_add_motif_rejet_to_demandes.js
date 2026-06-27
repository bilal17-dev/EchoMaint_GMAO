// Ajoute la colonne motif_rejet absente de la migration initiale.
// Nullable : seules les demandes rejetées ont un motif.
exports.up = function (knex) {
  return knex.schema.alterTable('demandes_intervention', (table) => {
    table.text('motif_rejet').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('demandes_intervention', (table) => {
    table.dropColumn('motif_rejet');
  });
};
