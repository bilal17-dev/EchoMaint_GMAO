import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
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
import MaintenancePlans from './pages/MaintenancePlans'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

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
            <Route path="/demandes-intervention" element={<DemandesIntervention />} />

            {/* Routes admin uniquement */}
            <Route element={<AdminRoute />}>
              <Route path="/utilisateurs" element={<Utilisateurs />} />
              
              <Route path="/maintenance-plans" element={<MaintenancePlans />} />
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