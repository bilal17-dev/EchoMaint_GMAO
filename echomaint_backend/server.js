// On charge les variables d'environnement depuis le fichier .env
require('dotenv').config();

// On importe Express pour créer notre serveur
const express = require('express');

// On importe CORS pour autoriser le frontend à communiquer avec le backend
const cors = require('cors');

// On crée l'application Express
const app = express();

// On dit à Express d'accepter les données JSON dans les requêtes
app.use(express.json());

// On autorise les requêtes venant d'autres origines (frontend sur port 5173 par exemple)
app.use(cors());

// Route de test: pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.json({ message: 'Serveur EchoMaint opérationnel ✓' });
});

// On démarre le serveur sur le port défini dans .env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
