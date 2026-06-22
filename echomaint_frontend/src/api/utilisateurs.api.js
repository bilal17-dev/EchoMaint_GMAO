import api from './axios.config'

// Mock de secours — à retirer dès que Dev 1 monte la route /utilisateurs dans server.js
const mockUtilisateurs = [
  { id: 'u1', nom: 'Diop', prenom: 'Aishatou', email: 'admin@dgsafrica.com', role: 'admin', actif: true },
  { id: 'u2', nom: 'Diop', prenom: 'Modou', email: 'tech1@dgsafrica.com', role: 'technicien', actif: true },
  { id: 'u3', nom: 'Ndiaye', prenom: 'Awa', email: 'tech2@dgsafrica.com', role: 'technicien', actif: true },
  { id: 'u4', nom: 'Sall', prenom: 'Omar', email: 'client1@dgsafrica.com', role: 'client', actif: true },
]

export async function getUtilisateurs() {
  try {
    const res = await api.get('/utilisateurs')
    return res.data
  } catch (err) {
    console.warn('[MOCK] /utilisateurs non disponible, données mockées utilisées.')
    return { data: mockUtilisateurs }
  }
}

export async function createUtilisateur(data) {
  try {
    const res = await api.post('/utilisateurs', data)
    return res.data
  } catch (err) {
    // Mock : simule une création
    console.warn('[MOCK] Création utilisateur simulée.')
    return { data: { id: `u${Date.now()}`, ...data, actif: true } }
  }
}

export async function updateUtilisateur(id, data) {
  try {
    const res = await api.put(`/utilisateurs/${id}`, data)
    return res.data
  } catch (err) {
    console.warn('[MOCK] Mise à jour utilisateur simulée.')
    return { data: { id, ...data } }
  }
}