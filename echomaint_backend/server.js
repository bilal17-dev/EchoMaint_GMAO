// 1. On charge les variables d'environnement depuis le fichier .env
require('dotenv').config();

// 2. On importe Express et les outils globaux
const express = require('express');
const cors = require('cors');

// 3. On importe les fichiers de routes (Dev 1)
const authRoutes = require('./app/routes/auth.routes');
const batimentRoutes = require('./app/routes/batiment.routes');
const equipementRoutes = require('./app/routes/equipement.routes'); // Ajouté !

// 4. On crée l'application Express
const app = express();

// 5. MIDDLEWARES GLOBAUX (Obligatoirement AVANT les routes !)
app.use(cors()); // Autorise le frontend à communiquer
app.use(express.json()); // Traduit les données JSON entrantes pour req.body

// 6. BRANCHEMENT DES ROUTES DE L'API
app.use('/api/auth', authRoutes);         // Routes d'authentification (Inscriptions, Login)
app.use('/api/batiments', batimentRoutes); // Routes des bâtiments (CRUD)
app.use('/api/equipements', equipementRoutes); // Ajouté !

// 7. Route de test principale
app.get('/', (req, res) => {
  res.json({ message: 'Serveur EchoMaint opérationnel ✓' });
});

// 8. On démarre le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});