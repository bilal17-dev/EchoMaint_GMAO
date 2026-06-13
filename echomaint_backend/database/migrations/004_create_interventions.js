/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('interventions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('equipement_id').references('id').inTable('equipements').onDelete('CASCADE');
    table.enum('type', ['preventive', 'curative']).notNullable();
    table.enum('priorite', ['basse', 'moyenne', 'haute']).notNullable();
    
    // Modification selon image_d0651c.png
    table.enum('statut', ['ouverte', 'assignee', 'en_cours', 'cloturee']).defaultTo('ouverte');
    
    table.uuid('technicien_id').references('id').inTable('users').onDelete('SET NULL');
    table.text('description').notNullable();
    table.dateTime('date_planifiee');
    table.dateTime('date_cloture');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('interventions');
};