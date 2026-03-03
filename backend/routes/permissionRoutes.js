const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { verifyToken } = require('../middleware/authMiddleware');

// Endpoint untuk melihat daftar akses (Dikelompokkan berdasarkan tipe resource)
router.get('/folder/:id', verifyToken, permissionController.getFolderAccessList);
router.get('/document/:id', verifyToken, permissionController.getDocumentAccessList);

// Endpoint untuk menambah/mengubah akses
router.post('/grant', verifyToken, permissionController.grantAccess);

// Endpoint untuk menghapus akses berdasarkan ID baris di tabel permission
router.delete('/revoke/:id', verifyToken, permissionController.revokeAccess);

module.exports = router;