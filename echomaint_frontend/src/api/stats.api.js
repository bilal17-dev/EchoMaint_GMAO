import api from './axios.config';

// KPI globaux du tableau de bord (déjà existant)
export const getKpiResume = async (params) => (await api.get('/kpi/resume', { params })).data;

// Top 5 équipements et top 5 bâtiments avec le plus de pannes (nouveau)
export const getKpiParEquipement = async () => (await api.get('/kpi/par-equipement')).data;

// Évolution des interventions sur les 12 derniers mois (nouveau)
export const getKpiEvolution = async () => (await api.get('/kpi/evolution')).data;