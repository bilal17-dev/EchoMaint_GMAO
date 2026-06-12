exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nom').notNullable();
    table.string('prenom').notNullable();
    table.string('email').notNullable().unique();
    table.string('mot_de_passe').notNullable();
    table.enum('role', ['admin', 'technicien', 'client']).notNullable();
    table.timestamps(true, true); 
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};