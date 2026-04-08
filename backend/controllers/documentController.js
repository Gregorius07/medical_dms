const DocumentModel = require("../models/documentModel");
const { getPagination } = require("../utils/pagination");
const path = require("path");
const fs = require("fs");
const PermissionModel = require("../models/permissionModel");
const AuditModel = require("../models/auditModel");
const ApprovalModel = require("../models/approvalModel");
const pdf = require("pdf-parse");
const elasticClient = require("../config/elastic");

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

      const result = await DocumentModel.create(docData);
      await PermissionModel.grantAccess(
        uploaderName,
        result.id,
        "DOCUMENT",
        { preview: true, download: true, edit_metadata: true, upload: true },
        "System",
      );
      res
        .status(201)
        .json({ success: true, message: "Dokumen berhasil diupload" });
      try {
        console.log("Mulai mengekstrak teks dari PDF...");

        // baca file PDF fisik berdasarkan path
        const dataBuffer = fs.readFileSync(req.file.path);

        // ekstrak teks menggunakan pdf-parse
        const parsedPdf = await pdf(dataBuffer);

        // bersihkan teks dari enter (\n) yang berlebihan agar rapi
        const cleanText = parsedPdf.text.replace(/\s+/g, " ").trim();

        console.log("Teks berhasil diekstrak. Mengirim ke Elasticsearch...");

        // simpan ke Elasticsearch
        await elasticClient.index({
          index: "medical_documents",
          document: {
            id_document: result.id,
            title: req.body.title || req.file.originalname,
            content: cleanText, // berisi konten pdf
          },
        });

        console.log("Dokumen berhasil di-index ke Elasticsearch!");
      } catch (elasticError) {
        // tidak di throw agar proses utama tetap sukses
        console.error(
          "Dokumen tersimpan di database, tapi gagal di-index ke Elasticsearch:",
          elasticError.message,
        );
      }
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
      try {
        await elasticClient.delete({
          index: "medical_documents",
          id: req.params.id.toString(), 
        });
        console.log(
          `Dokumen dengan ID ${req.params.id} berhasil dihapus dari Elasticsearch.`,
        );
      } catch (elasticError) {
        if (elasticError.meta && elasticError.meta.statusCode === 404) {
          console.log(
            `Dokumen ID ${req.params.id} tidak ditemukan di ES, lewati.`,
          );
        } else {
          console.error(
            "Gagal menghapus dari Elasticsearch:",
            elasticError.message,
          );
        }
      }
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
      const result = await DocumentModel.getAccessibleDocuments(
        req.userId,
        req.name,
      );
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
      try {
        console.log("Mengekstrak teks dari file revisi terbaru...");

        const dataBuffer = fs.readFileSync(req.file.path);
        const parsedPdf = await pdf(dataBuffer); // menggunakan const pdf = require('pdf-parse')
        const cleanText = parsedPdf.text.replace(/\s+/g, " ").trim();

        // 2. Kirim perintah UPDATE ke Elasticsearch
        await elasticClient.update({
          index: "medical_documents",
          id: docId.toString(), // id dokumen yang direvisi
          doc: {
            content: cleanText,
          },
        });

        console.log(
          ` Teks revisi untuk dokumen ID ${docId} berhasil di-update di Elasticsearch!`,
        );
      } catch (elasticError) {
        console.error(
          " Gagal meng-update versi baru ke Elasticsearch:",
          elasticError.message,
        );
        // Jangan throw error agar user tetap sukses mengupload revisi di PostgreSQL
      }

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
        return res
          .status(400)
          .json({ message: "Keyword pencarian wajib diisi!" });
      }

      if (type === "fulltext") {
        try {
          console.log(`Mencari dokumen dengan keyword: "${q}"...`);

          // 1. Lakukan pencarian ke Elasticsearch
          const result = await elasticClient.search({
            index: "medical_documents",
            query: {
              query_string: {
                query: `${q}*`,
                fields: ["content"],
                default_operator: "AND",
              },
            },
            highlight: {
              pre_tags: [
                "<mark class='bg-yellow-200 text-yellow-900 font-bold px-1 rounded'>",
              ],
              post_tags: ["</mark>"],
              fields: {
                content: {
                  fragment_size: 150,
                  number_of_fragments: 3,
                },
                title: {},
              },
            },
          });

          const esHits = result.hits.hits;

          // Jika Elasticsearch tidak menemukan apa-apa, langsung kembalikan array kosong
          if (esHits.length === 0) {
            return res.status(200).json({
              total_found: 0,
              data: [],
            });
          }

          // 2. Ekstrak array ID dari hasil pencarian Elasticsearch
          const documentIds = esHits.map((hit) => hit._source.id_document);

          // 3. Tarik data (Metadata) dari PostgreSQL MELALUI MODEL
          const dbDocuments = await DocumentModel.getDocumentsByIds(documentIds);

          // 4. GABUNGKAN (Merge) data dari Elasticsearch dengan data dari PostgreSQL
          const mergedData = esHits.map((hit) => {
            const esId = hit._source.id_document;
            // Cari kecocokan data dari DB berdasarkan ID
            const dbData = dbDocuments.find((doc) => doc.id_document === esId);

            return {
              id_document: esId,
              score: hit._score,
              highlights: hit.highlight,
              
              // Prioritaskan data dari DB, jika tidak ada fallback ke ES/Default
              title: dbData ? (dbData.title || dbData.file_name) : hit._source.title,
              created_by: dbData ? dbData.created_by : "-",
              created_at: dbData ? dbData.created_at : null,
              approval_status: dbData ? dbData.approval_status : "UNKNOWN",
            };
          });

          // 5. Kembalikan data yang sudah digabung
          return res.status(200).json({
            total_found: result.hits.total.value,
            data: mergedData,
          });

        } catch (error) {
          console.error("Error Elasticsearch Search:", error.message);
          return res
            .status(500)
            .json({ message: "Terjadi kesalahan pada mesin pencari." });
        }
      } else {
        // Pencarian Metadata Default (MELALUI MODEL)
        const metadataResults = await DocumentModel.searchMetadata(userId, q);
        return res.json({ data: metadataResults });
      }
    } catch (error) {
      console.error("Error search documents:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat melakukan pencarian." });
    }
  },
};

module.exports = DocumentController;
