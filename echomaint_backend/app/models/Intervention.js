const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Intervention = {

  // Récupérer toutes les interventions avec filtres, tris et jointures complètes
  findAll: async (filters = {}) => {
    let query = db('interventions')
      .select(
        'interventions.*',
        'equipements.nom as equipement_nom',
        'equipements.code as equipement_code', // Harmonisé (code ou reference selon ta table)
        'batiments.nom as batiment_nom',
        db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom")
      )
      .join('equipements', 'interventions.equipement_id', 'equipements.id')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('users', 'interventions.technicien_id', 'users.id');

    // Filtres dynamiques
    if (filters.statut) query = query.where('interventions.statut', filters.statut);
    if (filters.type) query = query.where('interventions.type', filters.type);
    if (filters.technicien_id) query = query.where('interventions.technicien_id', filters.technicien_id);
    if (filters.batiment_id) query = query.where('batiments.id', filters.batiment_id);
    if (filters.priorite) query = query.where('interventions.priorite', filters.priorite);

    return query.orderBy('interventions.date_planifiee', 'asc');
  },

  // Fiche ultra-détaillée d'une intervention (avec Photos, Commentaires et Réouvertures)
  findById: async (id) => {
    const intervention = await db('interventions')
      .select(
        'interventions.*',
        'equipements.nom as equipement_nom',
        'equipements.statut as equipement_statut',
        'batiments.id as batiment_id',
        'batiments.nom as batiment_nom',
        db.raw("CONCAT(users.prenom, ' ', users.nom) as technicien_nom")
      )
      .join('equipements', 'interventions.equipement_id', 'equipements.id')
      .join('batiments', 'equipements.batiment_id', 'batiments.id')
      .leftJoin('users', 'interventions.technicien_id', 'users.id')
      .where('interventions.id', id)
      .first();

    if (!intervention) return null;

    // 1. Récupération des photos de l'intervention
    intervention.photos = await db('photos_intervention')
      .where({ intervention_id: id });

    // 2. Récupération des commentaires liés (avec le nom complet de l'auteur)
    intervention.commentaires = await db('commentaires_intervention')
      .select('commentaires_intervention.*', db.raw("CONCAT(users.prenom, ' ', users.nom) as auteur"))
      .join('users', 'commentaires_intervention.user_id', 'users.id')
      .where({ intervention_id: id })
      .orderBy('created_at', 'asc');

    // 3. Récupération de l'historique des réouvertures (suivi des OT)
    intervention.reouvertures = await db('reouvertures_ot')
      .select('reouvertures_ot.*', db.raw("CONCAT(users.prenom, ' ', users.nom) as auteur"))
      .join('users', 'reouvertures_ot.user_id', 'users.id')
      .where({ intervention_id: id })
      .orderBy('created_at', 'asc');

    return intervention;
  },

  // Créer une nouvelle intervention (avec UUID)
  create: async (data) => {
    const id = uuidv4();
    
    await db('interventions').insert({
      id,
      titre: data.titre,
      description: data.description,
      type: data.type, // 'correctif' ou 'preventif'
      statut: data.statut || 'a_planifier',
      priorite: data.priorite || 'moyenne',
      date_planifiee: data.date_planifiee || null,
      equipement_id: data.equipement_id,
      technicien_id: data.technicien_id || null
    });
    
    return Intervention.findById(id);
  },

  // Modifier une intervention
  update: async (id, data) => {
    await db('interventions').where({ id }).update({
      titre: data.titre,
      description: data.description,
      type: data.type,
      statut: data.statut,
      priorite: data.priorite,
      date_planifiee: data.date_planifiee,
      technicien_id: data.technicien_id,
      updated_at: db.fn.now()
    });
    
    return Intervention.findById(id);
  },

  // Gardien métier (issu de ton deuxième code) : Évite d'ouvrir deux fois la même panne
  getActiveIntervention: async (equipementId, type) => {
    return db('interventions')
      .where('equipement_id', equipementId)
      .where('type', type)
      .whereNotIn('statut', ['terminee', 'annulee']) // Aligné avec notre fonction hasOTActifs !
      .first();
  },

  // Enregistrer une réouverture d'Ordre de Travail (OT)
  enregistrerReouverture: async (intervention_id, user_id, motif, statut_precedent) => {
    const id = uuidv4();
    return db('reouvertures_ot').insert({
      id,
      intervention_id,
      user_id,
      motif,
      statut_precedent,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
  }
};

module.exports = Intervention;