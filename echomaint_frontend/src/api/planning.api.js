// On importe l'instance Axios déjà configurée
import api from './axios.config';

// Récupère le planning des interventions
// params peut contenir : technicien_id, batiment_id, statut, date_debut, date_fin
// Si aucun filtre n'est donné, le backend retourne par défaut les 30 prochains jours
export const getPlanning = async (params) => (await api.get('/planning', { params })).data;