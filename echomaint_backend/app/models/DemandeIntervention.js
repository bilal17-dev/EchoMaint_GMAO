const db = require('../../database/connection');

const DemandeIntervention = {
  create: async (data) => {
    await db('demandes_intervention').insert(data);
    return db('demandes_intervention').where({ id: data.id }).first();
  },

  findAll: async (filtres = {}) => {
    const query = db('demandes_intervention')
      .join('clients', 'demandes_intervention.client_id', '=', 'clients.id')
      .join('equipements', 'demandes_intervention.equipement_id', '=', 'equipements.id')
      .select(
        'demandes_intervention.*',
        'clients.nom as client_nom', 
        'equipements.nom as equipement_nom',
        'equipements.reference as equipement_reference'
      )
      .orderBy('demandes_intervention.created_at', 'desc');

    if (filtres.statut) query.where('demandes_intervention.statut', filtres.statut);
    if (filtres.client_id) query.where('demandes_intervention.client_id', filtres.client_id);

    return query;
  },

  findById: async (id) => {
    return db('demandes_intervention')
      .join('clients', 'demandes_intervention.client_id', '=', 'clients.id')
      .join('equipements', 'demandes_intervention.equipement_id', '=', 'equipements.id')
      .select(
        'demandes_intervention.*',
        'clients.nom as client_nom',
        'equipements.nom as equipement_nom',
        'equipements.reference as equipement_reference'
      )
      .where('demandes_intervention.id', id)
      .first();
  },

  update: async (id, data) => {
    await db('demandes_intervention')
      .where({ id })
      .update({ ...data, updated_at: new Date() });
    return db('demandes_intervention').where({ id }).first();
  }
};

module.exports = DemandeIntervention;