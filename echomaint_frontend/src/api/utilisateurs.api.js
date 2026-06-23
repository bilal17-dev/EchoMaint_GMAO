import api from './axios.config'

export const getUtilisateurs   = async ()          => (await api.get('/utilisateurs')).data
export const getTechniciens    = async ()          => (await api.get('/utilisateurs/techniciens')).data
export const getUtilisateur    = async (id)        => (await api.get(`/utilisateurs/${id}`)).data
export const createUtilisateur = async (data)      => (await api.post('/utilisateurs', data)).data
export const updateUtilisateur = async (id, data)  => (await api.put(`/utilisateurs/${id}`, data)).data
export const deleteUtilisateur = async (id)        => (await api.delete(`/utilisateurs/${id}`)).data
export const updateLangue      = async (id, langue) => (await api.put(`/utilisateurs/${id}/langue`, { langue })).data