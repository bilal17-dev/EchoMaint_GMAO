import api from './axios.config';

export const getKpiResume = async (params) => (await api.get('/kpi/resume', { params })).data;