import api from './axios.config';

// Admin : toutes les DI | Client : uniquement les siennes (filtré par le backend)
export const getDemandes = async () => (await api.get('/demandes-intervention')).data;

export const getDemande = async (id) => (await api.get(`/demandes-intervention/${id}`)).data;

// Client : soumettre une nouvelle DI
export const creerDemande = async (data) => (await api.post('/demandes-intervention', data)).data;

// Admin : convertir une DI en OT curatif
export const convertirDemande = async (id) => (await api.post(`/demandes-intervention/${id}/valider`)).data;

// Admin : rejeter une DI avec motif
export const rejeterDemande = async (id, motif_rejet) => (await api.post(`/demandes-intervention/${id}/rejeter`, { motif_rejet })).data;