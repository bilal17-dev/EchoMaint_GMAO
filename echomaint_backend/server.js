// On charge les variables d'environnement depuis le fichier .env
require('dotenv').config();

// On importe Express pour créer notre serveur
const express = require('express');

// On importe CORS pour autoriser le frontend à communiquer avec le backend
const cors = require('cors');

const path    = require('path');

// Démarrage du cron job
require('./jobs/preventive.job');

// Import des routes créées par Dev 1
const authRoutes         = require('./app/routes/auth.routes');
const batimentRoutes     = require('./app/routes/batiment.routes');
const equipementRoutes   = require('./app/routes/equipement.routes');
const interventionRoutes = require('./app/routes/intervention.routes');
const statsRoutes        = require('./app/routes/stats.routes');

// On crée l'application Express
const app = express();

// On dit à Express d'accepter les données JSON dans les requêtes
app.use(express.json());

// On autorise les requêtes venant d'autres origines (frontend sur port 5173 par exemple)
app.use(cors());

// Servir les fichiers statiques (photos et rapports PDF)
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Branchement des routes
app.use('/api/auth',          authRoutes);
app.use('/api/batiments',     batimentRoutes);
app.use('/api/equipements',   equipementRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/kpi',         statsRoutes);


// Route de test: pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.json({ message: 'Serveur EchoMaint opérationnel ✓' });
});

// On démarre le serveur sur le port défini dans .env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});