const DocumentModel = require('../models/documentModel');
const { getPagination } = require('../utils/pagination');
const path = require('path');
const fs = require('fs');
const { getMe } = require('./authController');

const DocumentController = {
    findAll: async (req, res) => {
        const { page, size, search } = req.query;
        const { limit, offset } = getPagination(page, size);

        try {
            const { rows, total } = await DocumentModel.getAll(search, limit, offset);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    totalItems: total,
                    totalPages,
                    currentPage: Number(page) || 1,
                    pageSize: limit
                }
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    upload: async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        try {
            // Data dari Frontend (FormData)
            const { title, folderId, uploaderName } = req.body;
            
            const docData = {
                title: title,
                folderId: folderId ? parseInt(folderId) : null,
                storedFilename: req.file.filename, // Nama file UUID dari Multer
                fileFormat: path.extname(req.file.originalname).substring(1), // pdf, docx
                fileSize: req.file.size,
                uploader: uploaderName || "Unknown",
                metadata: {} // Nanti diisi dari dynamic form
            };

            await DocumentModel.create(docData);
            res.status(201).json({ success: true, message: "Dokumen berhasil diupload" });

        } catch (err) {
            // Hapus file jika database gagal agar tidak jadi sampah
            if (req.file) {
                fs.unlinkSync(path.join('uploads', req.file.filename));
            }
            console.error(err);
            res.status(500).json({ message: "Gagal menyimpan dokumen ke database" });
        }
    },

    delete: async (req, res) => {
        try {
            await DocumentModel.softDelete(req.params.id);
            res.json({ success: true, message: "Dokumen berhasil dihapus (Soft Delete)" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getAccessibleDocumentsId: async (req,res) =>{
        try {
            const result = await DocumentModel.getAccessibleDocuments(req.userId);
            res.json(result.map(item => item.id_document));
        } catch (error) {
            res.status(500).json({ message: "Gagal mengambil accesible document" });
        }
    }
};

module.exports = DocumentController;