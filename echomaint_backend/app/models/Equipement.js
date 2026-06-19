const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Equipement = {
  findAll: async (userRole, userClientId, filters = {}) => {
    // 1. Débogage : Nombre total brut sans aucun filtre
    const totalBrut = await db('equipements').count('id as total').first();
    console.log('--- DEBUG FIND ALL ---');
    console.log('Total équipements en base (brut) :', totalBrut.total);

    let query = db('equipements')
      .select('equipements.*', 'batiments.nom as batiment_nom', 'clients.nom as client_nom')
      .leftJoin('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('clients', 'batiments.client_id', 'clients.id')
      .whereNull('equipements.deleted_at'); 

    if (userRole === 'client') {
      query = query.where('batiments.client_id', userClientId);
    } else if (filters.client_id) {
      query = query.where('batiments.client_id', filters.client_id);
    }

    if (filters.batiment_id) query = query.where('equipements.batiment_id', filters.batiment_id);
    if (filters.statut) query = query.where('equipements.statut', filters.statut);
    if (filters.search) query = query.where('equipements.nom', 'like', `%${filters.search}%`);

    // 2. Débogage : Afficher la requête SQL générée
    console.log('Requête SQL générée :', query.toString());

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;
    
    const results = await query.limit(limit).offset((page - 1) * limit);
    console.log('Nombre de résultats après filtres :', results.length);
    console.log('----------------------');

    return results;
  },

  findById: async (id) => {
    return db('equipements')
      .select('equipements.*', 'batiments.nom as batiment_nom', 'clients.nom as client_nom')
      .leftJoin('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('clients', 'batiments.client_id', 'clients.id')
      .where('equipements.id', id)
      .whereNull('equipements.deleted_at')
      .first();
  },

  create: async (data) => {
    const id = uuidv4();
    const now = new Date();
    const equipementData = {
      id,
      nom: data.nom,
      code_inventaire: data.code_inventaire || null,
      categorie: data.categorie || 'technique',
      batiment_id: data.batiment_id,
      statut: data.statut || 'en_service',
      created_at: now,
      updated_at: now
    };
    await db('equipements').insert(equipementData);
    return Equipement.findById(id);
  },
    
  update: async (id, data) => {
    await db('equipements').where({ id }).update({
      nom: data.nom,
      code_inventaire: data.code_inventaire,
      categorie: data.categorie,
      statut: data.statut,
      batiment_id: data.batiment_id,
      updated_at: db.fn.now()
    });
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
    return db('equipements').where({ id }).update({ 
      deleted_at: db.fn.now() 
    });
  }
};

module.exports = Equipement;