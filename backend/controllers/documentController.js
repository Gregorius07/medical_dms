const DocumentModel = require("../models/documentModel");
const { getPagination } = require("../utils/pagination");
const path = require("path");
const fs = require("fs");
const PermissionModel = require("../models/permissionModel");
const AuditModel = require("../models/auditModel");
const ApprovalModel = require("../models/approvalModel");
const pdf = require("pdf-parse");
const elasticClient = require("../config/elastic");
const FolderModel = require("../models/folderModel");
const extractTitleFromPdf = require("../utils/pdfTitleExtractor");
const { get } = require("http");

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
      const { title, folderId, uploaderName, customMetadata } = req.body;
      let customMetadataParsed = null;
      if (customMetadata) {
        try {
          customMetadataParsed = JSON.parse(customMetadata); //ubah objek json string ke objek js biasa
        } catch (error) {
          console.error("gagal memparsing custom metadata", error);
        }
      }
      const docData = {
        title: title,
        folderId: folderId ? parseInt(folderId) : null,
        storedFilename: req.file.filename,
        fileSize: req.file.size,
        uploader: uploaderName || "Unknown",
        metadata: customMetadataParsed, // Nanti diisi dari dynamic form
      };

      const result = await DocumentModel.create(docData);
      await PermissionModel.grantAccess(
        uploaderName,
        result.id,
        "DOCUMENT",
        { preview: true, download: true, edit_metadata: true, upload: true },
        req.name,
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

        // Ekstrak OTOMATIS TITLE berdasarkan ukuran font (menggunakan pdf2json)
        let autoTitle = null;
        try {
          console.log("Mengekstrak judul otomatis dengan pdf2json...");
          autoTitle = await extractTitleFromPdf(req.file.path);
          if (autoTitle) {
            console.log(`Judul berhasil diekstrak: "${autoTitle}"`);
          } else {
            autoTitle = title; // fallback ke judul dari input user atau nama file
          }
        } catch (err) {
          console.error("Gagal mengekstrak judul otomatis:", err.message);
        }

        // 3. Tentukan Judul Final (Prioritas: Input User -> Hasil Ekstraksi -> Nama File)
        // const finalTitle = req.body.title || autoTitle || filename;
        // simpan ke Elasticsearch
        await elasticClient.index({
          index: "medical_documents",
          id: result.id.toString(), // gunakan ID dari database sebagai ID di Elasticsearch
          document: {
            id_document: result.id,
            title: autoTitle,
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

      const result = await AuditModel.log(
        "DELETE",
        "DOCUMENT",
        req.userId,
        null,
        req.params.id,
        `${req.name} menghapus dokumen ini`,
      );
      res.json({
        success: true,
        message: "Dokumen berhasil dihapus (Soft Delete)",
      });
      console.log(result);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  permanentlyDeleteDocument: async (req, res) => {
    try {
      if (req.role !== "admin") {
        return res.status(403).json({
          message: "Akses ditolak. Hanya admin yang dapat menghapus permanen.",
        });
      }

      const { id } = req.params;
      const deletedDoc = await DocumentModel.getDeletedDocumentById(id);

      if (!deletedDoc) {
        return res
          .status(404)
          .json({ message: "Dokumen tidak ditemukan di recycle bin." });
      }

      //cari path semua versi dokumen yang akan dihapus permanen
      const filePaths = await DocumentModel.permanentlyDeleteDocument(id);

      for (const filePath of filePaths) {
        const absolutePath = path.join(__dirname, "../", filePath);
        try {
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath); //hapus dokumen
          }
        } catch (fileError) {
          console.error(
            `Gagal menghapus file ${absolutePath}:`,
            fileError.message,
          );
        }
      }

      //hapus di indeks elasticsearchnya
      try {
        await elasticClient.delete({
          index: "medical_documents",
          id: id.toString(),
        });
      } catch (elasticError) {
        if (elasticError.meta && elasticError.meta.statusCode !== 404) {
          console.error(
            "Gagal menghapus dokumen permanen dari Elasticsearch:",
            elasticError.message,
          );
        }
      }
      //catat di log
      await AuditModel.log(
        "DELETE",
        "DOCUMENT",
        req.userId,
        null,
        null,
        `${req.name} menghapus permanen dokumen ${deletedDoc.file_name}`,
      );

      res.status(200).json({
        success: true,
        message: "Dokumen berhasil dihapus secara permanen.",
      });
    } catch (error) {
      console.error("Error permanentlyDeleteDocument:", error);
      res.status(500).json({
        message: error.message || "Gagal menghapus dokumen secara permanen.",
      });
    }
  },

  getRecycleBin: async (req, res) => {
    try {
      const deletedDocuments =
        req.role === "admin"
          ? await DocumentModel.getDeletedDocumentsForAdmin() //kalau admin bisa lihat semua dokumen yang dihapus
          : await DocumentModel.getDeletedDocumentsForUser(req.userId); //kalau user biasa hanya bisa lihat dokumen yang dia hapus sendiri

      res.status(200).json({
        success: true,
        data: deletedDocuments,
      });
    } catch (error) {
      console.error("Error getRecycleBin:", error);
      res
        .status(500)
        .json({ message: "Gagal mengambil daftar dokumen di recycle bin." });
    }
  },

  restoreDocument: async (req, res) => {
    try {
      const { id } = req.params;

      // Cek apakah dokumen ada di recycle bin (sudah di soft delete)
      const deletedDoc = await DocumentModel.getDeletedDocumentById(id);
      if (!deletedDoc) {
        return res
          .status(404)
          .json({ message: "Dokumen tidak ditemukan di recycle bin." });
      }

      //harus cek apakah user yang melakukan restore adalah pemilik dokumen atau admin
      if (req.role !== "admin" && deletedDoc.created_by !== req.name) {
        return res.status(403).json({
          message: "Akses ditolak. Anda bukan pemilik dokumen ini.",
        });
      }

      const docDetail = await DocumentModel.getDocumentById(id); //ambil detail dokumen sebelum di restore

      const restored = await DocumentModel.restoreSoftDeletedDocument(id);
      try {
        //mengindeks dokumen ke elasticsearch setelah di restore
        console.log("Mulai mengekstrak teks dari PDF...");

        // baca file PDF fisik berdasarkan path
        const dataBuffer = fs.readFileSync(docDetail.file_path);

        // ekstrak teks menggunakan pdf-parse
        const parsedPdf = await pdf(dataBuffer);

        // bersihkan teks dari enter (\n) yang berlebihan agar rapi
        const cleanText = parsedPdf.text.replace(/\s+/g, " ").trim();

        console.log("Teks berhasil diekstrak. Mengirim ke Elasticsearch...");

        // Ekstrak OTOMATIS TITLE berdasarkan ukuran font (menggunakan pdf2json)
        let autoTitle = null;
        try {
          console.log("Mengekstrak judul otomatis dengan pdf2json...");
          autoTitle = await extractTitleFromPdf(docDetail.file_path);
          if (autoTitle) {
            console.log(`Judul berhasil diekstrak: "${autoTitle}"`);
          } else {
            autoTitle = docDetail.file_name; // fallback ke nama file dokumen lama
          }
        } catch (err) {
          console.error("Gagal mengekstrak judul otomatis:", err.message);
        }

        // simpan ke Elasticsearch
        await elasticClient.index({
          index: "medical_documents",
          id: req.params.id.toString(), // gunakan ID dari database sebagai ID di Elasticsearch
          document: {
            id_document: req.params.id,
            title: autoTitle,
            content: cleanText, // berisi konten pdf (teks)
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
      if (!restored) {
        return res
          .status(400)
          .json({ message: "Dokumen gagal direstore dari recycle bin." });
      }

      await AuditModel.log(
        "UPDATE",
        "DOCUMENT",
        req.userId,
        restored.id_folder,
        id,
        `${req.name} melakukan restore dokumen dari recycle bin`,
      );

      res.status(200).json({
        success: true,
        message: "Dokumen berhasil direstore.",
      });
    } catch (error) {
      console.error("Error restoreDocument:", error);
      res.status(500).json({ message: "Gagal melakukan restore dokumen." });
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

      // Ambil detail dokumen
      const document = await DocumentModel.getDocumentById(docId);
      if (!document) {
        return res
          .status(404)
          .json({ message: "Dokumen tidak ditemukan atau telah dihapus." });
      }

      // Ambil paket permission khusus untuk user yang sedang login
      const permissions = await PermissionModel.getAllPermissionsForDocument(
        userId,
        docId,
      );

      const logs = await AuditModel.getLogsByDocumentId(docId);
      await AuditModel.log(
        "PREVIEW",
        "DOCUMENT",
        userId,
        null,
        docId,
        `${req.name} melakukan preview`,
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
        null,
        docId,
        `${req.name} melakukan download`,
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
      const { uploaderName, customMetadata } = req.body;

      let customMetadataParsed = null;
      if (customMetadata) {
        try {
          customMetadataParsed = JSON.parse(customMetadata);
        } catch (error) {
          console.error("gagal memparsing custom metadata", error);
        }
      }

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
        customMetadataParsed,
      );

      const existingDoc = await DocumentModel.getDocumentById(docId);
      try {
        console.log("Mengekstrak teks dari file revisi terbaru...");

        const dataBuffer = fs.readFileSync(req.file.path);
        const parsedPdf = await pdf(dataBuffer); // menggunakan const pdf = require('pdf-parse')
        const cleanText = parsedPdf.text.replace(/\s+/g, " ").trim();

        // Ekstrak OTOMATIS TITLE berdasarkan ukuran font (menggunakan pdf2json)
        let autoTitle = null;
        try {
          console.log("Mengekstrak judul otomatis dengan pdf2json...");
          autoTitle = await extractTitleFromPdf(req.file.path);
          if (autoTitle) {
            console.log(`Judul berhasil diekstrak: "${autoTitle}"`);
          } else {
            autoTitle = existingDoc.file_name; // fallback ke nama file dokumen lama
          }
        } catch (err) {
          console.error("Gagal mengekstrak judul otomatis:", err.message);
        }

        // 2. Kirim perintah UPDATE ke Elasticsearch
        await elasticClient.update({
          index: "medical_documents",
          id: docId.toString(), // id dokumen yang direvisi
          doc: {
            title: autoTitle,
            content: cleanText,
          },
        });

        console.log(
          `Revisi untuk dokumen ID ${docId} berhasil di-update di Elasticsearch!`,
        );
      } catch (elasticError) {
        console.error(
          " Gagal meng-update versi baru ke Elasticsearch:",
          elasticError.message,
        );
        // Jangan throw error agar user tetap sukses mengupload revisi di PostgreSQL
      }

      res.status(201).json({ message: "Revisi dokumen berhasil diunggah." });
      //catat di log
      await AuditModel.log(
        "UPLOAD",
        "DOCUMENT",
        req.userId,
        null,
        docId,
        `${req.name} melakukan upload`,
      );
    } catch (error) {
      console.error("Error upload revision:", error);
      res.status(500).json({ message: "Gagal mengunggah revisi dokumen." });
    }
  },

  searchDocuments: async (req, res) => {
    try {
      const userId = req.userId;
      const fullname = req.name;
      const { q, type } = req.query; // q = keyword, type = 'metadata' atau 'fulltext'
      const { location } = req.query; //lokasi pencarian: home, folder, draft
      console.log("location:", location);
      let allowedIds = [];

      if (!q || q.trim() === "") {
        return res
          .status(400)
          .json({ message: "Keyword pencarian wajib diisi!" });
      }

      if (type === "fulltext") {
        try {
          if (location === "home") {
            // Ambil semua dokumen yang bisa diakses user dari database
            let accessibleDocs = [];
            if (req.role === "admin") {
              console.log("User adalah admin, mengambil semua dokumen...");
              accessibleDocs = await DocumentModel.getDocumentsInRootForAdmin();
              console.log(`Total dokumen yang diambil untuk admin: ${accessibleDocs.length}`);
            } else {
              accessibleDocs = await DocumentModel.getAccessibleDocuments(
                userId,
                req.name,
              );
            }
            console.log(`Isi getaccesibledocs: ${accessibleDocs}`);
            allowedIds = accessibleDocs.map((doc) => doc.id_document); //berisi id dokumen yang bisa diakses user
            console.log(`Isi allowedIds: ${allowedIds}`);
          } else {
            //ambil semua dokumen yang bisa diakses user dari draft
            const draftId =
              await FolderModel.getDraftFolderByFullname(fullname);
            console.log("Draft id :", draftId);

            const accessibleDocs =
              await DocumentModel.getAllDocumentsInFolderRecursive(
                draftId.id_folder,
              );
            allowedIds = accessibleDocs.map((doc) => doc.id_document);
            console.log(`Isi allowedIds: ${allowedIds}`);
          }
          console.log(`Mencari dokumen dengan keyword: "${q}"...`);

          // Lakukan pencarian ke Elasticsearch
          const result = await elasticClient.search({
            index: "medical_documents",
            query: {
              bool: {
                // MUST: Syarat pencarian teks (Harus cocok dengan keyword)
                must: [
                  {
                    multi_match: {
                      query: `${q}`,
                      fields: ["content", "title^2"],
                      operator: "AND",
                    },
                  },
                ],
                // FILTER: Syarat keamanan (ID dokumen harus ada di dalam array allowedIds)
                filter: [
                  {
                    terms: {
                      id_document: allowedIds, // hanya dokumen yang boleh diakses yang akan muncul di hasil pencarian
                    },
                  },
                ],
              },
            },
            highlight: {
              pre_tags: [
                "<mark class='bg-yellow-200 text-yellow-900 font-bold px-1 rounded'>",
              ],
              post_tags: ["</mark>"],
              fields: {
                content: {
                  fragment_size: 150, //150 karakter
                  number_of_fragments: 3, // maksimal 3 potongan teks yang ditampilkan
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
          const dbDocuments =
            await DocumentModel.getDocumentsByIds(documentIds);

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
              title: dbData ? dbData.file_name : hit._source.title,
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
      } else {// Pencarian Metadata Default (MELALUI MODEL)
        
        if (location === "home") {
          const accessibleDocs = await DocumentModel.getAccessibleDocuments(
            userId,
            req.name,
          );
          // console.log(`Isi getaccesibledocs: ${accessibleDocs}`);
          allowedIds = accessibleDocs.map((doc) => doc.id_document);
          console.log(`Isi allowedIds: ${allowedIds}`);
        } else {
          const draftId = await FolderModel.getDraftFolderByFullname(fullname);
          // console.log("Draft id :", draftId);

          const accessibleDocs =
            await DocumentModel.getAllDocumentsInFolderRecursive(
              draftId.id_folder,
            );
          allowedIds = accessibleDocs.map((doc) => doc.id_document);
          console.log(`Isi allowedIds: ${allowedIds}`);
        }

        //mengambil data metadata dari database berdasarkan keyword pencarian
        let metadataResults = await DocumentModel.searchMetadata(userId, q);
        metadataResults = metadataResults.filter((doc) => //filtering dokumen yang bisa diakses user
          allowedIds.includes(doc.id_document),
        );
        console.log("Metadata Result :", Object.values(metadataResults));

        return res.json({ data: metadataResults });
      }
    } catch (error) {
      console.error("Error search documents:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan saat melakukan pencarian." });
    }
  },

  // Mengambil daftar versi untuk frontend
  getVersions: async (req, res) => {
    try {
      const { id } = req.params;
      const versions = await DocumentModel.getDocumentVersions(id);
      res.status(200).json({ data: versions });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Gagal mengambil riwayat versi dokumen." });
    }
  },

  // Melakukan aksi Rollback
  rollbackVersion: async (req, res) => {
    try {
      const { id } = req.params;
      const { targetVersionId } = req.body;
      const userId = req.userId; // Dari middleware auth
      const userRole = req.userRole; // Dari middleware auth, sesuaikan dengan nama properti Anda

      // 1. Dapatkan detail dokumen untuk cek permission (Hanya Pemilik & Admin)
      const doc = await DocumentModel.getDocumentById(id);
      if (!doc)
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });

      const isOwner = doc.created_by === req.name; // Asumsi req.username ada dari token
      const isAdmin = userRole === "admin" || req.isAdmin === true;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          message:
            "Anda tidak memiliki izin untuk melakukan rollback dokumen ini.",
        });
      }

      // 2. Lakukan Rollback di Database PostgreSQL
      const rolledBackDoc = await DocumentModel.rollbackVersion(
        id,
        targetVersionId,
      );

      await AuditModel.log(
        "ROLLBACK",
        "DOCUMENT",
        req.userId,
        null,
        id,
        `${req.name} melakukan rollback`,
      );
      // 3. SINKRONISASI KE ELASTICSEARCH (Sangat Penting)
      try {
        console.log("Sinkronisasi Rollback ke Elasticsearch...");

        const dataBuffer = fs.readFileSync(rolledBackDoc.file_path);
        const parsedPdf = await pdf(dataBuffer);
        const cleanText = parsedPdf.text.replace(/\s+/g, " ").trim();

        await elasticClient.index({
          index: "medical_documents",
          id: id.toString(),
          document: {
            id_document: id,
            title:
              rolledBackDoc.file_name,
            content: cleanText,
          },
        });
        console.log(`Teks Rollback dokumen ID ${id} berhasil di-index!`);
      } catch (esError) {
        console.error(
          "⚠️ Peringatan: Rollback database sukses, tapi Elasticsearch gagal:",
          esError.message,
        );
      }

      res.status(200).json({ message: "Berhasil melakukan rollback dokumen." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Gagal memproses rollback." });
    }
  },
  // Tambahkan fungsi ini di dalam documentController.js
  updateMetadata: async (req, res) => {
    try {
      const { id } = req.params;
      const { custom_metadata, file_name } = req.body;
      const userId = req.userId;
      const userRole = req.userRole; // Asumsi dari middleware auth

      // 1. Cek eksistensi dokumen & Hak Akses (Otorisasi)
      const doc = await DocumentModel.getDocumentById(id);
      if (!doc) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });
      }

      // 2. Eksekusi UPDATE ke PostgreSQL melalui MODEL
      const updatedVersion = await DocumentModel.updateCustomMetadata(
        id,
        custom_metadata,
        file_name,
      );

      console.log("updated version", updatedVersion);

      await AuditModel.log(
        "EDIT",
        "DOCUMENT",
        req.userId,
        null,
        id,
        `${req.name} melakukan edit metadata`,
      );

      if (!updatedVersion) {
        return res.status(404).json({
          message: "Gagal memperbarui. Tidak ada versi dokumen yang aktif.",
        });
      }

      // 4. Kembalikan respons sukses ke Frontend
      res.status(200).json({
        message: "Metadata berhasil diperbarui.",
        data: updatedVersion,
      });
    } catch (error) {
      console.error("Error update metadata:", error);
      res.status(500).json({
        message: "Terjadi kesalahan pada server saat memperbarui metadata.",
      });
    }
  },

  getDocumentMetadata: async (req, res) => {
    try {
      const { id } = req.params;
      const metadata = await DocumentModel.getDocumentMetadata(id);

      if (!metadata) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });
      }

      res.status(200).json({ document: metadata });
    } catch (error) {
      console.error("Error getDocumentMetadata:", error);
      res.status(500).json({
        message:
          "Terjadi kesalahan pada server saat mengambil metadata dokumen.",
      });
    }
  },

  getDocumentPermissions: async (req, res) => {
    try {
      const { id } = req.params;
      const permissions = await PermissionModel.getAllPermissionsForDocument(
        req.userId,
        id,
      );
      res.status(200).json({ permissions });
    } catch (error) {
      console.error("Error getDocumentPermissions:", error);
      res.status(500).json({
        message: "Terjadi kesalahan pada server saat mengambil izin dokumen.",
      });
    }
  },

  moveDocument: async (req, res) => {
    try {
      const { id } = req.params;
      const { newFolderId } = req.body;
      const userId = req.userId;
      const userName = req.name;
      const isAdmin = req.role === "admin";

      // 1. Validasi: Check if document exists
      const document = await DocumentModel.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });
      }

      // 2. Validasi: Prevent moving to the same folder
      if (document.id_folder === newFolderId) {
        return res.status(400).json({
          message: "Dokumen sudah berada di folder tersebut.",
        });
      }

      // 3. Validasi: Check if target folder exists (if newFolderId is provided)
      if (newFolderId) {
        const targetFolder = await FolderModel.getFolderDetail(newFolderId);
        if (!targetFolder) {
          return res.status(404).json({
            message: "Folder tujuan tidak ditemukan.",
          });
        }

        console.log("Target Folder:", Object.values(targetFolder));
        console.log(
          "metadata skema folder",
          Object.keys(targetFolder.metadata_schema),
        );

        let newDocMetadata = {};
        if (targetFolder.metadata_schema) {
          const key = Object.keys(targetFolder.metadata_schema);
          newDocMetadata = Object.fromEntries(key.map((k) => [k, ""]));
          console.log("metadata dokumen yang akan dipindahkan", newDocMetadata);
        }
        await DocumentModel.updateAllCustomMetadata(id, newDocMetadata);

        // 4. PERMISSION CHECK: Verify user has 'upload' permission in target folder
        // (Memanfaatkan PermissionModel seperti permission middleware)
        if (!isAdmin) {
          const hasUploadAccess = await PermissionModel.checkMultipleAccess(
            userId,
            [newFolderId],
            "FOLDER",
            "upload",
          );
          if (!hasUploadAccess) {
            return res.status(403).json({
              message: "Anda tidak memiliki izin upload di folder tujuan.",
            });
          }
        }
      }

      // 5. Execute moveDocument
      const movedDoc = await DocumentModel.moveDocument(id, newFolderId);

      // 6. Log audit trail
      await AuditModel.log(
        "UPDATE",
        "DOCUMENT",
        userId,
        newFolderId,
        id,
        `${userName} memindahkan dokumen ke folder lain)`,
      );

      res.status(200).json({
        success: true,
        message: "Dokumen berhasil dipindahkan.",
        data: movedDoc,
      });
    } catch (error) {
      console.error("Error moveDocument:", error);
      res.status(500).json({
        message: "Gagal memindahkan dokumen.",
        error: error.message,
      });
    }
  },
};

module.exports = DocumentController;
