// On importe l'instance Axios déjà configurée
import api from './axios.config';

// Récupère tous les utilisateurs (admin uniquement)
export const getUtilisateurs = async () => (await api.get('/utilisateurs')).data;

// Récupère uniquement la liste des techniciens (utile pour assigner une intervention)
export const getTechniciens = async () => (await api.get('/utilisateurs/techniciens')).data;

// Récupère un utilisateur précis
export const getUtilisateur = async (id) => (await api.get(`/utilisateurs/${id}`)).data;

// Crée un nouvel utilisateur (admin uniquement)
// data doit contenir : nom, prenom, email, password, role
export const createUtilisateur = async (data) => (await api.post('/utilisateurs', data)).data;

// Modifie un utilisateur existant
export const updateUtilisateur = async (id, data) => (await api.put(`/utilisateurs/${id}`, data)).data;

// Supprime un utilisateur
export const deleteUtilisateur = async (id) => (await api.delete(`/utilisateurs/${id}`)).data;

// Change la langue préférée d'un utilisateur (fr ou en)
export const updateLangue = async (id, langue) => (await api.put(`/utilisateurs/${id}/langue`, { langue })).data;