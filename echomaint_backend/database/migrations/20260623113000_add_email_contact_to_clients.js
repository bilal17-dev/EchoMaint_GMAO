exports.up = function(knex) {
  return knex.schema.table('clients', function(table) {
    // On ajoute le champ en précisant 'nullable' pour ne pas bloquer les données existantes
    table.string('email_contact', 255).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('clients', function(table) {
    // Si besoin d'annuler, on supprime la colonne
    table.dropColumn('email_contact');
  });
};