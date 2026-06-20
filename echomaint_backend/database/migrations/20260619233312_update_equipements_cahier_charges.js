/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('equipements', (table) => {
    // 1. Ajout des nouveaux champs
    table.string('reference', 100);
    table.string('type', 100);
    table.string('marque', 100);
    table.string('modele', 100);
    table.string('numero_serie', 100);
    table.date('date_installation');

    // 2. Si tu veux renommer ou supprimer les anciens champs (ex: categorie)
    // Attention : cela supprimera les données dans cette colonne !
    table.dropColumn('categorie');
    table.dropColumn('periodicite_preventive_jours');
    table.dropColumn('date_acquisition');
  });
};

exports.down = function(knex) {
  return knex.schema.table('equipements', (table) => {
    // Inverse des opérations
    table.dropColumn('reference');
    table.dropColumn('type');
    table.dropColumn('marque');
    table.dropColumn('modele');
    table.dropColumn('numero_serie');
    table.dropColumn('date_installation');
    
    // Remise des anciens champs si nécessaire
    table.string('categorie');
    table.integer('periodicite_preventive_jours');
    table.date('date_acquisition');
  });
};