// Ce validator vérifie les données reçues pour créer
// ou modifier un équipement

const validerEquipement = (req, res, next) => {

  const { nom, reference, batiment_id, date_installation, statut } = req.body;

  const erreurs = [];

  // Vérification du nom et de la réference de l'equipement 
  if (!nom) {
    erreurs.push('Le nom de l\'équipement est obligatoire.');
  } else if (nom.length > 150) {
    erreurs.push('Le nom ne peut pas dépasser 150 caractères.');
  }
  if (!reference) erreurs.push('La référence est obligatoire.');
  
  // Vérification du batiment_id
  if (!batiment_id) {
    erreurs.push('L\'identifiant du bâtiment (batiment_id) est obligatoire.');
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(batiment_id)) {
      erreurs.push('Le format de batiment_id est invalide. Un UUID est attendu.');
    }
  }

  // RG-REF-04 : date pas dans le futur
  if (date_installation && new Date(date_installation) > new Date()) {
    erreurs.push('La date d\'installation ne peut pas être dans le futur.');
  }
  
  // Vérification du statut
  const statutsAutorises = ['actif', 'en_panne', 'hors_service'];
  if (!statut) {
    erreurs.push('Le statut est obligatoire.');
  } else if (!statutsAutorises.includes(statut)) {
    erreurs.push('Le statut doit être : actif, en_panne, ou hors_service.');
  }

  // S'il y a des erreurs, on bloque et on les renvoie
  if (erreurs.length > 0) {
    return res.status(400).json({
      message: 'Données invalides pour l\'équipement.',
      erreurs: erreurs
    });
  }

  next();
};

module.exports = validerEquipement;