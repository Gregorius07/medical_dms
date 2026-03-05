const DocumentModel = require("../models/documentModel");
const { getPagination } = require("../utils/pagination");
const path = require("path");
const fs = require("fs");
const PermissionModel = require("../models/permissionModel");
const AuditModel = require("../models/auditModel");
const ApprovalModel = require("../models/approvalModel");

const DocumentController = {
  getStats: async (req, res) => {
    try {
      const stats = await DocumentModel.getStats(req.userId, req.name);
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Gagal mengambil data stats" });
    }
  },

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
          pageSize: limit,
        },
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
        fileFormat: path.extname(req.file.originalname).substring(1), // pdf, docx
        storedFilename: req.file.filename,
        fileSize: req.file.size,
        uploader: uploaderName || "Unknown",
        metadata: {}, // Nanti diisi dari dynamic form
      };

      await DocumentModel.create(docData);
      res
        .status(201)
        .json({ success: true, message: "Dokumen berhasil diupload" });
    } catch (err) {
      // Hapus file jika database gagal agar tidak jadi sampah
      if (req.file) {
        fs.unlinkSync(path.join("uploads", req.file.filename));
      }
      console.error(err);
      res.status(500).json({ message: "Gagal menyimpan dokumen ke database" });
    }
  },

  delete: async (req, res) => {
    try {
      await DocumentModel.softDelete(req.params.id);
      res.json({
        success: true,
        message: "Dokumen berhasil dihapus (Soft Delete)",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  getAccessibleDocumentsId: async (req, res) => {
    try {
      const result = await DocumentModel.getAccessibleDocuments(req.userId);
      res.json(result.map((item) => item.id_document));
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil accesible document" });
    }
  },

  getDocumentDetail: async (req, res) => {
    try {
      const docId = req.params.id;
      const userId = req.userId; // Dari verifyToken middleware

      // 1. Ambil detail dokumen
      const document = await DocumentModel.getDocumentById(docId);
      if (!document) {
        return res
          .status(404)
          .json({ message: "Dokumen tidak ditemukan atau telah dihapus." });
      }

      // 2. Ambil paket permission khusus untuk user yang sedang login
      const permissions = await PermissionModel.getAllPermissionsForDocument(
        userId,
        docId,
      );

      const logs = await AuditModel.getLogsByDocumentId(docId);
      await AuditModel.log(
        "PREVIEW",
        "DOCUMENT",
        userId,
        document.id_folder,
        docId,
      );

      const activeApproval = await ApprovalModel.getActiveApprovalInfo(docId);

      // 3. Kirim keduanya ke frontend
      res.json({
        document: document,
        permissions: permissions,
        logs: logs,
        activeApproval: activeApproval,
      });
    } catch (error) {
      console.error("Error getDocumentDetail:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat memuat detail dokumen." });
    }
  },
  downloadDocument: async (req, res) => {
    try {
      const docId = req.params.id;

      // Ambil info dokumen dari database
      const document = await DocumentModel.getDocumentById(docId);
      if (!document) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });
      }

      // Tentukan path asli file di server
      const filePath = path.join(__dirname, "../", document.file_path);

      // res.download akan memaksa browser untuk mengunduh file
      res.download(filePath, document.file_name);
      await AuditModel.log(
        "DOWNLOAD",
        "DOCUMENT",
        req.userId,
        document.id_folder,
        docId,
      );
    } catch (error) {
      console.error("Error download document:", error);
      res.status(500).json({ message: "Gagal mengunduh dokumen." });
    }
  },

  uploadRevision: async (req, res) => {
    try {
      const docId = req.params.id;
      const file = req.file; // Didapat dari middleware Multer
      const { uploaderName } = req.body;

      if (!file) {
        return res
          .status(400)
          .json({ message: "File PDF revisi tidak ditemukan." });
      }

      await DocumentModel.addDocumentRevision(
        docId,
        file.originalname,
        file.filename,
        file.size,
        uploaderName,
        (file.format = path.extname(req.file.originalname).substring(1)),
      );

      const existingDoc = await DocumentModel.getDocumentById(docId);

      res.status(201).json({ message: "Revisi dokumen berhasil diunggah." });
      await AuditModel.log(
        "UPLOAD",
        "DOCUMENT",
        req.userId,
        existingDoc.id_folder,
        docId,
      );
    } catch (error) {
      console.error("Error upload revision:", error);
      res.status(500).json({ message: "Gagal mengunggah revisi dokumen." });
    }
  },

  searchDocuments: async (req, res) => {
    try {
      const userId = req.userId;
      const { q, type } = req.query; // q = keyword, type = 'metadata' atau 'fulltext'

      if (!q || q.trim() === "") {
        ``;
        return res.json({ data: [] });
      }

      let results = [];

      if (type === "fulltext") {
        // Placeholder untuk fitur Elasticsearch Anda selanjutnya
        // results = await ElasticSearchService.search(userId, q);
        return res.status(501).json({
          message: "Full-Text Search sedang dalam tahap pengembangan.",
        });
      } else {
        // Pencarian Metadata Default
        results = await DocumentModel.searchMetadata(userId, q);
      }

      res.json({ data: results });
    } catch (error) {
      console.error("Error search documents:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat melakukan pencarian." });
    }
  },
};

module.exports = DocumentController;
