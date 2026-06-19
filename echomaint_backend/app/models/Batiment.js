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
        'clients.nom as client_nom'
      )
      .leftJoin('clients', 'batiments.client_id', 'clients.id'); // leftJoin est plus sûr si un bâtiment n'a pas de client
    
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
      client_id: data.client_id || null
    });
    
    return Batiment.findById(id);
  },

  // Modifier un bâtiment (version sécurisée)
  update: async (id, data) => {
    // On construit l'objet de mise à jour dynamiquement
    const updateData = {};
    if (data.nom !== undefined) updateData.nom = data.nom;
    if (data.adresse !== undefined) updateData.adresse = data.adresse;
    if (data.ville !== undefined) updateData.ville = data.ville;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.client_id !== undefined) updateData.client_id = data.client_id;

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

  // Supprimer un bâtiment
  delete: async (id) => {
    return db('batiments').where({ id }).delete();
  },
};

module.exports = Batiment;