import api from './axios.config';

export const getInterventions  = async (params) => (await api.get('/interventions', { params })).data;
export const getIntervention   = async (id) => (await api.get(`/interventions/${id}`)).data;
export const createIntervention = async (data) => (await api.post('/interventions', data)).data;
export const assigner  = async (id, technicien_id) => (await api.post(`/interventions/${id}/assigner`, { technicien_id })).data;
export const demarrer  = async (id) => (await api.post(`/interventions/${id}/demarrer`)).data;
export const cloturer  = async (id, data) => (await api.post(`/interventions/${id}/cloturer`, data)).data;
export const rouvrir   = async (id, motif) => (await api.post(`/interventions/${id}/rouvrir`, { motif })).data;
export const annuler   = async (id) => (await api.post(`/interventions/${id}/annuler`)).data;
export const getRapportUrl = (id) => `${import.meta.env.VITE_API_URL}/interventions/${id}/rapport`;

export const uploadPhoto = async (id, file, type_photo) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type_photo', type_photo);
  return (await api.post(`/interventions/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })).data;
};