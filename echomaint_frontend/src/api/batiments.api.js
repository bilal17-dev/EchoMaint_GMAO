import api from './axios.config';

export const getBatiments = async () => (await api.get('/batiments')).data;
export const getBatiment  = async (id) => (await api.get(`/batiments/${id}`)).data;
export const createBatiment = async (data) => (await api.post('/batiments', data)).data;
export const updateBatiment = async (id, data) => (await api.put(`/batiments/${id}`, data)).data;
export const deleteBatiment = async (id) => (await api.delete(`/batiments/${id}`)).data;