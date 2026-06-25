const db = require('../../database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * Modèle Knex pour la table `photos_intervention`.
 * Chaque OT peut avoir plusieurs photos (avant / après intervention).
 */
const PhotoIntervention = {

  /**
   * Récupère toutes les photos associées à un OT donné.
   * Triées par date de création (la plus ancienne en premier).
   *
   * @param {string} intervention_id - L'UUID de l'intervention
   * @returns {Promise<Array>} La liste des photos
   */
  findByIntervention: async (intervention_id) => {
    return db('photos_intervention')
      .where({ intervention_id })
      .orderBy('created_at', 'asc');
  },

  /**
   * Récupère une photo précise par son identifiant unique.
   * Utile avant une suppression pour obtenir le chemin du fichier disque.
   *
   * @param {string} id - L'UUID de la photo
   * @returns {Promise<Object|undefined>} La photo ou undefined si inexistante
   */
  findById: async (id) => {
    return db('photos_intervention').where({ id }).first();
  },

  /**
   * Insère une nouvelle photo en base de données.
   * Le fichier doit déjà avoir été écrit sur le disque avant d'appeler cette méthode
   * (c'est multer qui s'en charge côté contrôleur).
   *
   * @param {Object} data
   * @param {string} data.intervention_id   - UUID de l'OT auquel appartient la photo
   * @param {string} data.type_photo        - 'avant' ou 'apres'
   * @param {string} data.chemin_fichier    - Chemin absolu du fichier sur le serveur
   * @param {string} data.nom_original      - Nom de fichier fourni par l'utilisateur
   * @param {number} data.taille_octets     - Poids du fichier en octets
   * @returns {Promise<Object>} L'enregistrement créé (résultat de findById)
   */
  create: async ({ intervention_id, type_photo, chemin_fichier, nom_original, taille_octets }) => {
    const id = uuidv4();
    await db('photos_intervention').insert({
      id,
      intervention_id,
      type_photo,
      chemin_fichier,
      nom_original,
      taille_octets,
      created_at: new Date(),
    });
    // On relit l'enregistrement pour renvoyer la forme complète (avec created_at normalisé)
    return PhotoIntervention.findById(id);
  },

  /**
   * Supprime une photo de la base de données.
   * ATTENTION : cette méthode ne supprime PAS le fichier sur le disque.
   * C'est le contrôleur qui doit appeler fs.unlinkSync() avant ou après.
   *
   * @param {string} id - L'UUID de la photo à supprimer
   * @returns {Promise<number>} Nombre de lignes supprimées (0 ou 1)
   */
  delete: async (id) => {
    return db('photos_intervention').where({ id }).delete();
  },
};

module.exports = PhotoIntervention;
