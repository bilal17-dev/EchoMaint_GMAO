const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

const Intervention = {
  findAll: async (filters = {}) => {
    // Jointures : équipement (obligatoire), bâtiment (via équipement), technicien (optionnel)
    let query = db('interventions')
      .select(
        'interventions.*',
        'equipements.nom   as equipement_nom',
        'equipements.reference as equipement_reference',
        'batiments.nom     as batiment_nom',
        // CONCAT retourne NULL si l'un des membres est NULL → COALESCE le ramène à ''
        db.raw("CONCAT(COALESCE(users.prenom,''), ' ', COALESCE(users.nom,'')) as technicien_nom")
      )
      .join('equipements', 'interventions.equipement_id', 'equipements.id')
      .join('batiments',   'equipements.batiment_id',     'batiments.id')
      .leftJoin('users',   'interventions.technicien_id', 'users.id');

    // ── Filtres scalaires ────────────────────────────────────────────────────
    // Chaque filtre est appliqué uniquement si la valeur est présente dans la requête.
    // On préfixe systématiquement la colonne (ex. 'interventions.statut') pour éviter
    // les ambiguïtés MySQL quand deux tables ont une colonne du même nom.

    if (filters.statut)
      query.where('interventions.statut', filters.statut);

    if (filters.type)
      query.where('interventions.type', filters.type);

    if (filters.priorite)
      query.where('interventions.priorite', filters.priorite);

    if (filters.batiment_id)
      query.where('batiments.id', filters.batiment_id);

    if (filters.technicien_id)
      query.where('interventions.technicien_id', filters.technicien_id);

    // ── Filtres de plage de dates (date_planifiee) ───────────────────────────
    // Les dates arrivent en chaîne YYYY-MM-DD depuis les query params.
    // Knex les compare correctement avec les colonnes DATETIME MySQL.
    if (filters.date_planifiee_debut)
      query.where('interventions.date_planifiee', '>=', filters.date_planifiee_debut);

    if (filters.date_planifiee_fin)
      query.where('interventions.date_planifiee', '<=', filters.date_planifiee_fin);

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