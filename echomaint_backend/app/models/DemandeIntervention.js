const db = require('../../database/connection');

const DemandeIntervention = {
  
  /**
   * 1. Soumettre une nouvelle demande d'intervention (DI)
   */
  create: async (data) => {
    // data contient : id, client_id, equipement_id, titre, description, priorite
    await db('demandes_intervention').insert(data);
    return db('demandes_intervention').where({ id: data.id }).first();
  },

  /**
   * 2. Lister toutes les DI avec filtres optionnels
   */
  findAll: async (filtres = {}) => {
    const query = db('demandes_intervention')
      .join('clients', 'demandes_intervention.client_id', '=', 'clients.id')
      .join('equipements', 'demandes_intervention.equipement_id', '=', 'equipements.id')
      .select(
        'demandes_intervention.*',
        'clients.nom as client_nom', 
        'equipements.nom as equipement_nom',
        'equipements.code_inventaire as equipement_code' // CORRIGÉ : Utilisation de code_inventaire
      )
      .orderBy('demandes_intervention.created_at', 'desc');

    if (filtres.statut) {
      query.where('demandes_intervention.statut', filtres.statut);
    }
    if (filtres.client_id) {
      query.where('demandes_intervention.client_id', filtres.client_id);
    }

    return query;
  },

  /**
   * 3. Trouver une DI spécifique par son ID
   */
  findById: async (id) => {
    return db('demandes_intervention')
      .join('clients', 'demandes_intervention.client_id', '=', 'clients.id')
      .join('equipements', 'demandes_intervention.equipement_id', '=', 'equipements.id')
      .select(
        'demandes_intervention.*',
        'clients.nom as client_nom',
        'equipements.nom as equipement_nom',
        'equipements.code_inventaire as equipement_code' // CORRIGÉ : Utilisation de code_inventaire
      )
      .where('demandes_intervention.id', id)
      .first();
  },

  /**
   * 4. Mettre à jour une DI
   */
  update: async (id, data) => {
    await db('demandes_intervention')
      .where({ id })
      .update({
        ...data,
        updated_at: new Date()
      });
    return db('demandes_intervention').where({ id }).first();
  }
};

module.exports = DemandeIntervention;