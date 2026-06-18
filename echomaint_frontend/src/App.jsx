import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Batiments from './pages/Batiments'
import Equipements from './pages/Equipements'
import FicheEquipement from './pages/FicheEquipement'
import Interventions from './pages/Interventions'
import DetailIntervention from './pages/DetailIntervention'
import Planning from './pages/Planning'
import Stats from './pages/Stats'
import Utilisateurs from './pages/Utilisateurs'
import Layout from './components/Layout'
import PrivateRoute from './routes/PrivateRoute'
import AdminRoute from './routes/AdminRoute'
import DemandesIntervention from './pages/DemandesIntervention'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<Login />} />

        {/* Routes protégées */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/batiments" element={<Batiments />} />
            <Route path="/equipements" element={<Equipements />} />
            <Route path="/equipements/:id" element={<FicheEquipement />} />
            <Route path="/interventions" element={<Interventions />} />
            <Route path="/interventions/:id" element={<DetailIntervention />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/stats" element={<Stats />} />

            {/* Routes admin uniquement */}
            <Route element={<AdminRoute />}>
              <Route path="/utilisateurs" element={<Utilisateurs />} />
              <Route path="/demandes-intervention" element={<DemandesIntervention />} />
            </Route>
          </Route>
        </Route>

        {/* Redirection par défaut */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App