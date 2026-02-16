const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
router.get('/', DocumentController.findAll);
// 'file' adalah nama field di FormData frontend
router.post('/', upload.single('file'), DocumentController.upload);
router.delete('/:id', DocumentController.delete);

module.exports = router;