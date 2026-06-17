/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('reouvertures_ot', (table) => {
    // 1. Clé primaire corrigée pour MySQL/XAMPP
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    
    // 2. Clé étrangère vers l'intervention concernée
    table.uuid('intervention_id').notNullable()
      .references('id').inTable('interventions')
      .onDelete('CASCADE'); // Si l'OT disparaît, son historique de réouverture aussi
    
    // 3. Clé étrangère vers l'utilisateur (l'admin) qui a fait l'action
    table.uuid('user_id').notNullable()
      .references('id').inTable('users')
      .onDelete('RESTRICT'); // Sécurité : impossible de supprimer l'user auteur de l'action
    
    // 4. Détails de l'action
    table.text('motif').notNullable();
    table.string('statut_precedent', 50).notNullable(); // Ex: 'terminee'
    
    // 5. Timestamps (Sert de date de réouverture via created_at)
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('reouvertures_ot');
};