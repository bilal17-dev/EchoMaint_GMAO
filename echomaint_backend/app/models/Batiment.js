const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Batiment = {

  // Récupérer tous les bâtiments avec jointure client et gestion des rôles (RG-06)
  findAll: async (userRole, userClientId, filters = {}) => {
    let query = db('batiments')
      // AJOUT : Sélection explicite de batiments.ville et batiments.description
      .select(
        'batiments.id', 
        'batiments.nom', 
        'batiments.adresse', 
        'batiments.ville', 
        'batiments.description', 
        'batiments.client_id', 
        'clients.nom as client_nom'
      )
      .join('clients', 'batiments.client_id', 'clients.id');
    
    // RÈGLE MÉTIER (RG-06) : Si l'utilisateur est un client, il ne voit QUE ses bâtiments
    if (userRole === 'client') {
      query = query.where('batiments.client_id', userClientId);
    } else if (filters.client_id) {
      // Si c'est un admin/tech, il peut filtrer par un client spécifique s'il le souhaite
      query = query.where('batiments.client_id', filters.client_id);
    }
    
    return query;
  },

  // Trouver un bâtiment par son ID (avec le nom de son client)
  findById: async (id) => {
    return db('batiments')
      .select('batiments.*', 'clients.nom as client_nom') // batiments.* prendra automatiquement ville et description
      .join('clients', 'batiments.client_id', 'clients.id')
      .where('batiments.id', id)
      .first();
  },

  // Créer un bâtiment avec UUID
  create: async (data) => {
    const id = uuidv4();
    
    await db('batiments').insert({
      id,
      nom: data.nom,
      adresse: data.adresse || null,
      ville: data.ville || null,              // AJOUT : Prise en compte de la ville
      description: data.description || null,  // AJOUT : Prise en compte de la description
      client_id: data.client_id // Clé étrangère vers la table clients
    });
    
    return Batiment.findById(id);
  },

  // Modifier un bâtiment
  update: async (id, data) => {
    await db('batiments').where({ id }).update({
      nom: data.nom,
      adresse: data.adresse,
      ville: data.ville,                      // AJOUT : Mise à jour de la ville
      description: data.description,          // AJOUT : Mise à jour de la description
      client_id: data.client_id
    });
    
    return Batiment.findById(id);
  },

  // Sécurité GMAO : Vérifie si le bâtiment a des équipements actifs avant suppression
  hasEquipementsActifs: async (id) => {
    const count = await db('equipements')
      .where({ batiment_id: id })
      .whereIn('statut', ['actif', 'en_panne'])
      .whereNull('deleted_at') // Utile si vous faites du soft delete plus tard
      .count('id as total')
      .first();
      
    return count.total > 0;
  },

  // Supprimer un bâtiment
  delete: async (id) => {
    return db('batiments').where({ id }).delete();
  },
};

module.exports = Batiment;