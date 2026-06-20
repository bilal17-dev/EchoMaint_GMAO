exports.up = function(knex) {
  return knex.schema.table('equipements', (table) => {
    // 1. Ajout de la description
    table.text('description').nullable();
    
    // 2. Suppression de l'ancienne colonne obsolète
    table.dropColumn('code_inventaire');
  });
};

exports.down = function(knex) {
  return knex.schema.table('equipements', (table) => {
    // Inverse : on remet l'ancienne colonne et on supprime la description
    table.string('code_inventaire', 50);
    table.dropColumn('description');
  });
};