// On importe l'instance Axios déjà configurée
// Elle contient déjà l'URL de base du backend et injecte automatiquement le token
import api from './axios.config';

// Récupère la liste de tous les clients
// Utilisé par exemple dans un menu déroulant pour choisir le client d'un bâtiment
export const getClients = async () => (await api.get('/clients')).data;

// Récupère un seul client précis grâce à son identifiant (id)
export const getClient = async (id) => (await api.get(`/clients/${id}`)).data;

// Crée un nouveau client en envoyant les données au backend
// data doit contenir : nom, email_contact, telephone, adresse
export const createClient = async (data) => (await api.post('/clients', data)).data;

// Modifie un client existant
export const updateClient = async (id, data) => (await api.put(`/clients/${id}`, data)).data;

// Supprime un client (impossible si des bâtiments lui sont rattachés)
export const deleteClient = async (id) => (await api.delete(`/clients/${id}`)).data;