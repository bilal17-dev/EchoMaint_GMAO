const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Equipement = {

  // Récupérer les équipements avec jointures, filtres de recherche, pagination et règle RG-06
  findAll: async (userRole, userClientId, filters = {}) => {
    let query = db('equipements')
      .select('equipements.*', 'batiments.nom as batiment_nom', 'clients.nom as client_nom')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .join('clients', 'batiments.client_id', 'clients.id')
      .whereNull('equipements.deleted_at'); // Filtre Soft Delete d'office

    // RÈGLE MÉTIER (RG-06) : Filtrage strict selon les droits d'accès
    if (userRole === 'client') {
      query = query.where('batiments.client_id', userClientId);
    } else if (filters.client_id) {
      // Un admin ou tech peut filtrer globalement par client
      query = query.where('batiments.client_id', filters.client_id);
    }

    // Filtres optionnels opérationnels
    if (filters.batiment_id) query = query.where('equipements.batiment_id', filters.batiment_id);
    if (filters.statut) query = query.where('equipements.statut', filters.statut);
    if (filters.search) query = query.where('equipements.nom', 'like', `%${filters.search}%`);

    // Système de pagination pour les performances du front-end
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;
    query = query.limit(limit).offset((page - 1) * limit);

    return query;
  },

  // Fiche détaillée d'un équipement
  findById: async (id) => {
    return db('equipements')
      .select('equipements.*', 'batiments.nom as batiment_nom', 'batiments.adresse as batiment_adresse', 'clients.nom as client_nom')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .join('clients', 'batiments.client_id', 'clients.id')
      .where('equipements.id', id)
      .whereNull('equipements.deleted_at')
      .first();
  },

  // Création avec génération automatique d'UUID
  create: async (data) => {
    const id = uuidv4();
    
    await db('equipements').insert({
      id,
      nom: data.nom,
      code: data.code || null, // Utile pour les codes barres / QR codes GMAO
      description: data.description || null,
      statut: data.statut || 'actif',
      batiment_id: data.batiment_id
    });
    
    return Equipement.findById(id);
  },

  // Mise à jour classique
  update: async (id, data) => {
    await db('equipements').where({ id }).update({
      nom: data.nom,
      code: data.code,
      description: data.description,
      statut: data.statut,
      batiment_id: data.batiment_id,
      updated_at: db.fn.now()
    });
    return Equipement.findById(id);
  },

  // Changement rapide de statut (ex: passage rapide à 'en_panne')
  updateStatut: async (id, statut) => {
    return db('equipements').where({ id }).update({ 
      statut, 
      updated_at: db.fn.now() 
    });
  },

  // Sécurité GMAO : Vérifie si la machine est liée à des interventions en cours
  hasOTActifs: async (id) => {
    const count = await db('interventions')
      .where({ equipement_id: id })
      .whereNotIn('statut', ['terminee', 'annulee']) // Statuts qui ferment un OT
      .count('id as total')
      .first();
    return count.total > 0;
  },

  // Soft delete pour ne jamais perdre l'historique de maintenance des équipements
  delete: async (id) => {
    return db('equipements').where({ id }).update({ 
      deleted_at: db.fn.now() 
    });
  },
};

module.exports = Equipement;