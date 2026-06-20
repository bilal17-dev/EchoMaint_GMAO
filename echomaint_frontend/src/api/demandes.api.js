// On importe l'instance Axios déjà configurée
import api from './axios.config';

// Récupère toutes les demandes d'intervention
// Un admin voit toutes les demandes, un client ne voit que les siennes (géré côté backend)
export const getDemandes = async () => (await api.get('/demandes')).data;

// Récupère une seule demande précise
export const getDemande = async (id) => (await api.get(`/demandes/${id}`)).data;

// Crée une nouvelle demande d'intervention (utilisé par un client qui signale une panne)
// data doit contenir : equipement_id, titre, description, priorite (optionnel)
export const createDemande = async (data) => (await api.post('/demandes', data)).data;

// Convertit une demande en ordre de travail curatif (admin uniquement)
export const convertirDemande = async (id) => (await api.post(`/demandes/${id}/convertir`)).data;