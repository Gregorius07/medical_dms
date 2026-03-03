const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {verifyToken} = require('../middleware/authMiddleware');
const {requirePermission }= require('../middleware/permissionMiddleware');
// Konfigurasi Penyimpanan File
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Simpan di folder uploads
    },
    filename: (req, file, cb) => {
        // Rename file jadi UUID + Ekstensi asli (misal: 550e8400... .pdf)
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// Routes
router.get('/', verifyToken, DocumentController.findAll);
// 'file' adalah nama field di FormData frontend
router.post('/',verifyToken, upload.single('file'), DocumentController.upload);
router.get('/getaccesibledocs',verifyToken, DocumentController.getAccessibleDocumentsId);
// Route pencarian
router.get('/search', verifyToken, DocumentController.searchDocuments);
// ... route /:id dan lainnya di bawahnya ...
router.delete('/:id', verifyToken,DocumentController.delete);
router.get('/:id', 
    verifyToken, 
    requirePermission('preview', 'DOCUMENT'), 
    DocumentController.getDocumentDetail
);
router.get('/:id/download', verifyToken, requirePermission('download', 'DOCUMENT'), DocumentController.downloadDocument);
router.post('/:id/revisions', verifyToken, requirePermission('upload', 'DOCUMENT'), upload.single('file'), DocumentController.uploadRevision);
module.exports = router;