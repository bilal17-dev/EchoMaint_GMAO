exports.up = function(knex) {
  return knex.schema.createTable('photos_intervention', function(table) {
    table.uuid('id').primary();
    
    table.uuid('intervention_id').notNullable()
      .references('id').inTable('interventions')
      .onDelete('CASCADE');
    
    // avant = photo prise avant l'intervention
    // apres = photo prise après l'intervention
    table.enum('type_photo', ['avant', 'apres']).notNullable();
    
    // Chemin du fichier sur le serveur
    table.string('chemin_fichier', 255).notNullable();
    
    // Nom original du fichier uploadé par le technicien
    table.string('nom_original', 255).notNullable();
    
    // Taille du fichier en octets
    table.integer('taille_octets').notNullable();
    
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('photos_intervention');
};