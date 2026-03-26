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

        // 1. Baca file PDF fisik dari folder uploads Anda
        // Asumsi path file ada di req.file.path (jika pakai multer)
        const dataBuffer = fs.readFileSync(req.file.path);

        // 2. Ekstrak teks menggunakan pdf-parse
        const parsedPdf = await pdf(dataBuffer);

        // Bersihkan teks dari enter (\n) yang berlebihan agar rapi
        const cleanText = parsedPdf.text.replace(/\s+/g, " ").trim();

        console.log("Teks berhasil diekstrak. Mengirim ke Elasticsearch...");

        // 3. Simpan ke Elasticsearch
        await elasticClient.index({
          index: "medical_documents",
          id: result.id, // PENTING: Samakan ID Elasticsearch dengan ID PostgreSQL agar sinkron
          document: {
            id_document: result.id,
            title: req.body.title || req.file.originalname,
            content: cleanText, // Isi lengkap PDF masuk ke sini
            uploader: req.name, // Asumsi nama user ada di req.user
            created_at: new Date().toISOString(),
          },
        });

        console.log("✅ Dokumen berhasil di-index ke Elasticsearch!");
      } catch (elasticError) {
        console.error(
          "⚠️ Peringatan: Dokumen tersimpan di database, tapi gagal di-index ke Elasticsearch:",
          elasticError.message,
        );
        // Kita tidak melakukan 'throw error' di sini agar proses upload utama tetap sukses
        // meskipun Elasticsearch sedang down.
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
        try {
          if (!q) {
            return res
              .status(400)
              .json({ message: "Keyword pencarian wajib diisi!" });
          }

          console.log(`Mencari dokumen dengan keyword: "${q}"...`);

          // Lakukan pencarian ke Elasticsearch
          const result = await elasticClient.search({
            index: "medical_documents",

            query: {
              // Gunakan query_string agar kita bisa menyisipkan Wildcard (*)
              query_string: {
                query: `${q}*`, // <--- Menambahkan bintang di akhir kata (sibr -> sibr*)
                fields: ["title^3", "content", "uploader"],
                default_operator: "AND", // Memastikan jika user mengetik 2 kata, keduanya harus ada
              },
            },
            // Fitur Highlight untuk mengambil potongan teks dari dalam PDF
            highlight: {
              // Pre dan Post tags ini akan mengapit kata yang ditemukan
              // Kita langsung gunakan class Tailwind CSS di sini agar siap pakai di SolidJS
              pre_tags: [
                "<mark class='bg-yellow-200 text-yellow-900 font-bold px-1 rounded'>",
              ],
              post_tags: ["</mark>"],
              fields: {
                content: {
                  fragment_size: 150, // Ambil 150 karakter di sekitar kata yang ditemukan
                  number_of_fragments: 3, // Maksimal ambil 3 potongan kalimat
                },
                title: {},
              },
            },
          });

          // Mapping (merapikan) hasil dari Elasticsearch sebelum dikirim ke frontend
          const hits = result.hits.hits.map((hit) => ({
            score: hit._score, // Nilai BM25
            id_document: hit._source.id_document,
            title: hit._source.title,
            uploader: hit._source.uploader,
            created_at: hit._source.created_at,
            highlights: hit.highlight, // Berisi array potongan teks HTML
          }));

          return res.status(200).json({
            total_found: result.hits.total.value,
            data: hits,
          });
        } catch (error) {
          console.error("Error Elasticsearch Search:", error.message);
          res
            .status(500)
            .json({ message: "Terjadi kesalahan pada mesin pencari." });
        }
      } else {
        // Pencarian Metadata Default
        results = await DocumentModel.searchMetadata(userId, q);
        return res.json({ data: results });
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
