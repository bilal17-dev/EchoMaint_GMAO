/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('photo_interventions', (table) => {
    // Correction MySQL/XAMPP
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('url').notNullable();
    table.enum('type_cliche', ['avant', 'apres']).notNullable();
    table.uuid('intervention_id').references('id').inTable('interventions').onDelete('CASCADE');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('photo_interventions');
};