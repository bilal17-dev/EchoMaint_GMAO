const db = require('../../database/connection');

class Intervention {
  // Trouver une intervention par son ID
  static async getById(id) {
    return db('interventions').where({ id }).first();
  }

  // Créer une nouvelle intervention
  static async create(data) {
    return db('interventions').insert(data);
  }

  // Modifier une intervention
  static async update(id, data) {
    return db('interventions').where({ id }).update(data);
  }

  // Récupérer une intervention ouverte pour un équipement et un type spécifique
  static async getActiveIntervention(equipementId, type) {
    return db('interventions')
      .where('equipement_id', equipementId)
      .where('type', type)
      .whereNot('statut', 'cloturee')
      .first();
  }
}

module.exports = Intervention;