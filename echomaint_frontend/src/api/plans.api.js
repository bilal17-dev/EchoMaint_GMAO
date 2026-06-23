import api from './axios.config'

export const getPlans          = async ()       => (await api.get('/plans-maintenance')).data
export const getPlan           = async (id)     => (await api.get(`/plans-maintenance/${id}`)).data
export const createPlan        = async (data)   => (await api.post('/plans-maintenance', data)).data
export const updatePlan        = async (id, data) => (await api.put(`/plans-maintenance/${id}`, data)).data
export const deletePlan        = async (id)     => (await api.delete(`/plans-maintenance/${id}`)).data
export const getPlansByEquipement = async (equipId) => (await api.get(`/equipements/${equipId}/plans-maintenance`)).data