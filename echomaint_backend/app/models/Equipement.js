const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Equipement = {
  findAll: async (userRole, userClientId, filters = {}) => {
    let query = db('equipements')
      .select('equipements.*', 'batiments.nom as batiment_nom', 'clients.nom as client_nom')
      .leftJoin('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('clients', 'batiments.client_id', 'clients.id');

    if (userRole === 'client') {
      query = query.where('batiments.client_id', userClientId);
    } else if (filters.client_id) {
      query = query.where('batiments.client_id', filters.client_id);
    }

    if (filters.batiment_id) query = query.where('equipements.batiment_id', filters.batiment_id);
    if (filters.statut) query = query.where('equipements.statut', filters.statut);
    if (filters.search) query = query.where('equipements.nom', 'like', `%${filters.search}%`);

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;

    return query.limit(limit).offset((page - 1) * limit);
  },

  findById: async (id) => {
    return db('equipements')
      .select('equipements.*', 'batiments.nom as batiment_nom', 'clients.nom as client_nom')
      .leftJoin('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('clients', 'batiments.client_id', 'clients.id')
      .where('equipements.id', id)
      .first();
  },

  create: async (data) => {
    const id = uuidv4();
    await db('equipements').insert({
      id,
      nom: data.nom,
      batiment_id: data.batiment_id,
      reference: data.reference || null,
      type: data.type || null,
      marque: data.marque || null,
      modele: data.modele || null,
      numero_serie: data.numero_serie || null,
      date_installation: data.date_installation || null,
      statut: data.statut || 'actif',
      description: data.description || null
    });
    return Equipement.findById(id);
  },

  update: async (id, data) => {
    const allowedFields = [
      'nom', 'batiment_id', 'reference', 'type', 'marque',
      'modele', 'numero_serie', 'date_installation', 'statut', 'description'
    ];
    const updateData = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });
    updateData.updated_at = db.fn.now();
    await db('equipements').where({ id }).update(updateData);
    return Equipement.findById(id);
  },

  hasOTActifs: async (id) => {
    const count = await db('interventions')
      .where({ equipement_id: id })
      .whereNotIn('statut', ['terminee', 'annulee'])
      .count('id as total')
      .first();
    return parseInt(count.total || 0) > 0;
  },

  delete: async (id) => {
    // Soft delete via updated_at uniquement — pas de deleted_at dans le schéma
    return db('equipements').where({ id }).update({ updated_at: db.fn.now() });
  }
};

module.exports = Equipement;