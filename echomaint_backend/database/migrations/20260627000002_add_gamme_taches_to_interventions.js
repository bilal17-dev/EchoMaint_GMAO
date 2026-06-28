/**
 * Migration : ajout de gamme_taches sur la table interventions
 *
 * Pourquoi stocker une copie ici alors qu'interventions.plan_maintenance_id
 * pointe déjà vers le plan ?
 *
 * Un OT préventif est un document figé : la gamme de tâches est capturée
 * au moment de la génération. Si le plan est modifié ultérieurement (ajout
 * ou suppression de tâches), les OT existants doivent conserver la liste
 * qu'ils avaient à leur création — à des fins historiques et de traçabilité.
 *
 * Rend nullable pour ne pas casser les OT curatifs qui n'ont pas de gamme.
 */
exports.up = function (knex) {
  return knex.schema.alterTable('interventions', (table) => {
    table.json('gamme_taches').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('interventions', (table) => {
    table.dropColumn('gamme_taches');
  });
};
