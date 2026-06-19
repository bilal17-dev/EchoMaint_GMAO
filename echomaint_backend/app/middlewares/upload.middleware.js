const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Définition du répertoire local des uploads (UPLOAD_PATH)
const UPLOAD_PATH = process.env.UPLOAD_PATH || 'storage/uploads/photos';

// S'assurer que le dossier existe
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    // Nommage strict du CDC : {intervention_id}_{type_photo}_{timestamp}.{ext}
    const interventionId = req.params.id;
    const typePhoto = req.body.type_photo || 'inconnu';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${interventionId}_${typePhoto}_${timestamp}${ext}`);
  }
});

const uploadPhoto = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // MAX_FILE_SIZE_MB = 5 Mo par fichier
  },
  fileFilter: (req, file, cb) => {
    // RG-PHOTO-02 : Validation des formats autorisés (JPEG/PNG)
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    
    // Le CDC exige un code 415 (Unsupported Media Type). On passe l'info à Express.
    const error = new Error("Format invalide. Seuls JPEG et PNG sont autorisés.");
    error.code = 'INVALID_MEDIA_TYPE';
    cb(error);
  }
}).single('file'); // Champ nommé 'file' d'après le CDC

// Middleware d'interception pour gérer proprement les erreurs Multer
const handleUploadMiddleware = (req, res, next) => {
  uploadPhoto(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(422).json({ message: "La taille du fichier dépasse la limite autorisée de 5 Mo." });
      }
      if (err.code === 'INVALID_MEDIA_TYPE') {
        return res.status(415).json({ message: err.message }); // Code 415 exigé !
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = handleUploadMiddleware;