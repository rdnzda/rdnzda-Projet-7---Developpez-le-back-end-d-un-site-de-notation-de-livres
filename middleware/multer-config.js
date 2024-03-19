const multer = require('multer');
const sharp = require('sharp');

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    const name = file.originalname.split(' ').join('_');
    const extension = MIME_TYPES[file.mimetype];
    callback(null, name + Date.now() + '.' + extension);
  }
});

const upload = multer({ storage: storage }).single('image');

// Middleware pour l'optimisation avec Sharp et conversion en WebP
const optimizeAndConvertToWebP = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Chemin du fichier WebP
    const webpFilePath = req.file.path.replace(/\.[^/.]+$/, '.webp');

    // Utiliser Sharp pour convertir en WebP
    await sharp(req.file.path)
      .webp({ quality: 50 }) // Spécifiez la qualité souhaitée pour le format WebP
      .toFile(webpFilePath);

    // Mettre à jour le chemin du fichier dans la requête pour refléter la conversion en WebP
    req.file.path = webpFilePath;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Multer Error: ' + err.message });
    } else if (err) {
      return res.status(500).json({ message: 'Internal Server Error: ' + err.message });
    }

    // Appeler le middleware d'optimisation et de conversion en WebP
    optimizeAndConvertToWebP(req, res, next);
  });
};