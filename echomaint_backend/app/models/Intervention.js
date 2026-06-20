const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Intervention = {
  findAll: async (filters = {}) => {
    let query = db('interventions')
      .select(
        'interventions.*',
        'equipements.nom as equipement_nom',
        'equipements.reference as equipement_reference',
        'batiments.nom as batiment_nom',
        db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom")
      )
      .join('equipements', 'interventions.equipement_id', 'equipements.id')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('users', 'interventions.technicien_id', 'users.id');

    if (filters.statut) query.where('interventions.statut', filters.statut);
    if (filters.batiment_id) query.where('batiments.id', filters.batiment_id);
    
    return query.orderBy('interventions.date_planifiee', 'asc');
  },

  findById: async (id) => {
    const i = await db('interventions')
      .select('interventions.*', 'equipements.nom as equipement_nom', 'batiments.nom as batiment_nom')
      .join('equipements', 'interventions.equipement_id', 'equipements.id')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .where('interventions.id', id).first();
    if (!i) return null;
    i.photos = await db('photos_intervention').where({ intervention_id: id });
    return i;
  },

  create: async (data) => {
    const id = uuidv4();
    await db('interventions').insert({ id, ...data });
    return Intervention.findById(id);
  },

  update: async (id, data) => {
    await db('interventions').where({ id }).update({ ...data, updated_at: db.fn.now() });
    return Intervention.findById(id);
  }
};

module.exports = Intervention;