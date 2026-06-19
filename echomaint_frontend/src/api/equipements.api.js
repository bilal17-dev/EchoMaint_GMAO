import api from './axios.config';

export const getEquipements  = async (params) => (await api.get('/equipements', { params })).data;
export const getEquipement   = async (id) => (await api.get(`/equipements/${id}`)).data;
export const getHistorique   = async (id) => (await api.get(`/equipements/${id}/historique`)).data;
export const createEquipement = async (data) => (await api.post('/equipements', data)).data;
export const updateEquipement = async (id, data) => (await api.put(`/equipements/${id}`, data)).data;
export const deleteEquipement = async (id) => (await api.delete(`/equipements/${id}`)).data;