// Ajoute les colonnes de réinitialisation de mot de passe sur la table users.
// reset_token : token unique généré lors d'une demande "mot de passe oublié"
// reset_token_expires : date d'expiration du token (1 heure après génération)
exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('reset_token').nullable();
    table.datetime('reset_token_expires').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('reset_token');
    table.dropColumn('reset_token_expires');
  });
};
