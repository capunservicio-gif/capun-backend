const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    createProgress,
    getChildProgress,
    getAllChildren,
    getStatistics
} = require('../controllers/progressController');

// Todas las rutas requieren autenticación
router.use(auth);

// Ruta para estadísticas
router.get('/statistics', getStatistics);

// Rutas para maestros/admins
router.get('/children', getAllChildren);
router.post('/progress', createProgress);
router.get('/progress/:childId', getChildProgress);

module.exports = router;