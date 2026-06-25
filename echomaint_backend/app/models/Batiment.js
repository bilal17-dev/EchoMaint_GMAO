const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Batiment = {
  // Récupérer tous les bâtiments
  findAll: async (userRole, userClientId, filters = {}) => {
    let query = db('batiments')
      .select(
        'batiments.id',
        'batiments.nom',
        'batiments.adresse',
        'batiments.ville',
        'batiments.description',
        'batiments.client_id',
        'clients.nom as client_nom',
        db.raw('COUNT(equipements.id) as nb_equipements')
      )
      .leftJoin('clients', 'batiments.client_id', 'clients.id')
      .leftJoin('equipements', function () {
        this.on('equipements.batiment_id', '=', 'batiments.id')
            .andOnNull('equipements.deleted_at')
      })
      .groupBy(
        'batiments.id',
        'batiments.nom',
        'batiments.adresse',
        'batiments.ville',
        'batiments.description',
        'batiments.client_id',
        'clients.nom'
      );

    if (userRole === 'client') {
      query = query.where('batiments.client_id', userClientId);
    } else if (filters.client_id) {
      query = query.where('batiments.client_id', filters.client_id);
    }

    return query;
  },

  // Trouver un bâtiment par son ID
  findById: async (id) => {
    return db('batiments')
      .select('batiments.*', 'clients.nom as client_nom')
      .leftJoin('clients', 'batiments.client_id', 'clients.id')
      .where('batiments.id', id)
      .first();
  },

  // Créer un bâtiment
  create: async (data) => {
    const id = uuidv4();
    await db('batiments').insert({
      id,
      nom: data.nom,
      adresse: data.adresse || null,
      ville: data.ville || null,
      description: data.description || null,
      client_id: data.client_id || null,
      created_at: db.fn.now()
    });
    return Batiment.findById(id);
  },

  // Modifier un bâtiment
  update: async (id, data) => {
    const updateData = {};
    const fields = ['nom', 'adresse', 'ville', 'description', 'client_id'];
    
    fields.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });

    updateData.updated_at = db.fn.now();

    await db('batiments').where({ id }).update(updateData);
    return Batiment.findById(id);
  },

  // Vérifie si le bâtiment a des équipements actifs
  hasEquipementsActifs: async (id) => {
    const result = await db('equipements')
      .where({ batiment_id: id })
      .whereIn('statut', ['actif', 'en_panne'])
      .whereNull('deleted_at')
      .count('id as total')
      .first();
    return parseInt(result.total) > 0;
  },

  delete: async (id) => {
    return db('batiments').where({ id }).delete();
  },
};

module.exports = Batiment;