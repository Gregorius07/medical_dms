const pool = require("../config/db");

const DocumentModel = {
  getStats: async (userId, fullname) => {
    // Asumsi: Kolom penyimpan kepemilikan dokumen di tabel 'document' bernama 'created_by' (menyimpan ID user).
    // Jika di database Anda kolomnya bernama 'id_user', silakan ganti 'd.created_by' menjadi 'd.id_user'.

    const [draftDocsRes, underReviewRes, recentDocsRes, pendingApprovalsRes] =
      await Promise.all([
        // 1. Total seluruh dokumen di draft milik user (Status = 'DRAFT')
        pool.query(
          `
                SELECT COUNT(DISTINCT d.id_document) as count
                FROM document d
                JOIN document_version dv ON d.id_document = dv.id_document
                WHERE dv.created_by = $1 
                  AND dv.approval_status = 'DRAFT' 
                  AND dv.is_active = TRUE
                  AND d.is_deleted = false
            `,
          [fullname],
        ),

        // 2. Total dokumen milik user (Status = 'PENDING')
        pool.query(
          `
                SELECT COUNT(DISTINCT d.id_document) as count
                FROM document d
                JOIN document_version dv ON d.id_document = dv.id_document
                WHERE dv.created_by = $1 
                  AND dv.approval_status = 'PENDING' 
                  AND dv.is_active = TRUE
                  AND d.is_deleted = false
            `,
          [fullname],
        ),

        // 3. Total dokumen milik user yang baru diupload dalam 7 hari terakhir
        pool.query(
          `
                SELECT COUNT(DISTINCT d.id_document) as count
                FROM document d
                JOIN document_version dv ON d.id_document = dv.id_document
                WHERE dv.created_by = $1 
                  AND dv.created_at >= NOW() - INTERVAL '7 days' 
                  AND dv.is_active = TRUE
                  AND d.is_deleted = false
            `,
          [fullname],
        ),

        // 4. Total Approval yang menunggu antrean persetujuan DARI USER INI
        pool.query(
          `
                SELECT COUNT(id_approval) as count
                FROM approval_request 
                WHERE id_approver = $1 
                  AND status = 'PENDING'
            `,
          [userId],
        ),
      ]);

    return {
      totalDrafts: parseInt(draftDocsRes.rows[0].count),
      underReview: parseInt(underReviewRes.rows[0].count),
      newDocuments: parseInt(recentDocsRes.rows[0].count),
      pendingApprovals: parseInt(pendingApprovalsRes.rows[0].count),
    };
  },

  // 1. GET ALL (Join dengan Version terbaru untuk dapat info file)
  getAll: async (search, limit, offset) => {
    let query = `
            SELECT d.id_document, d.file_name as title, f.folder_name,
                   v.file_name as physical_filename, v.version_number, v.file_size, v.created_by, v.approval_status,
                   v.created_at, v.file_path
            FROM document d
            JOIN document_version v ON d.id_document = v.id_document
            LEFT JOIN folder f ON d.id_folder = f.id_folder
            WHERE d.is_deleted = false AND v.is_active = true
        `;

    let params = [];

    if (search) {
      query += ` AND d.file_name ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY v.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const data = await pool.query(query, [...params, limit, offset]);

    // Count total untuk pagination
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM document WHERE is_deleted = false`,
    );

    return {
      rows: data.rows,
      total: parseInt(countRes.rows[0].count),
    };
  },

  // 2. CREATE DOCUMENT (Transaction)
  create: async (data) => {
    try {
      await pool.query("BEGIN");

      // A. Insert ke Tabel Dokumen (Wadah)
      const docRes = await pool.query(
        `INSERT INTO document (file_name, id_folder) VALUES ($1, $2) RETURNING id_document`,
        [data.title, data.folderId || null],
      );
      const docId = docRes.rows[0].id_document;
      const now = new Date().toISOString();
      const filePath = "uploads/" + data.storedFilename;

      // B. Insert ke Tabel Version (File Fisik)
      await pool.query(
        `INSERT INTO document_version 
                (version_number, file_name, file_size, custom_metadata, approval_status, created_by, is_active, id_document, id_folder,  created_at, file_path)
                VALUES ($1, $2, $3, $4, 'DRAFT', $5, true, $6, $7, $8, $9)`,
        [
          1, // Versi pertama
          data.title, // Nama file fisik (UUID)
          
          data.fileSize,
          data.metadata || {},
          data.uploader, // Nama user
          docId,
          data.folderId || null,
          now,
          filePath,
        ],
      );

      await pool.query("COMMIT");
      return { id: docId, ...data };
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  },

  // 3. SOFT DELETE
  softDelete: async (id) => {
    return await pool.query(
      "UPDATE document SET is_deleted = true WHERE id_document = $1",
      [id],
    );
  },

  // 2. Ambil SEMUA dokumen yang user punya hak akses SECARA LANGSUNG KECUALI DRAFT miliknya sendiri
  getAccessibleDocuments: async (userId, name) => {
    const query = `
            WITH RECURSIVE user_draft_tree AS (
                -- 1. BASE CASE: Cari folder Root 'Draft' milik user ini
                SELECT id_folder 
                FROM folder 
                WHERE folder_name LIKE 'Draft - ' || $2
                
                UNION ALL
                
                -- 2. RECURSIVE STEP: Cari seluruh sub-folder (anak cucu) yang berada di dalam folder Draft tadi
                SELECT f.id_folder 
                FROM folder f
                INNER JOIN user_draft_tree dt ON f.parent_folder = dt.id_folder
            )
            SELECT d.id_document, dv.file_name, dv.file_size, dv.created_at, dv.created_by, dv.approval_status,
                   p.preview, p.upload, p.download, p.edit_metadata
            FROM document d
            JOIN document_version dv ON d.id_document = dv.id_document
            JOIN permission p ON d.id_document = p.id_document
            WHERE p.id_user = $1 
              AND p.resource_type = 'DOCUMENT' 
              AND p.preview = TRUE 
              AND dv.is_active = true
              AND d.is_deleted = false
              AND d.id_folder NOT IN (SELECT id_folder FROM user_draft_tree)
            ORDER BY dv.created_at DESC;
        `;
    const { rows } = await pool.query(query, [userId, name]);
    return rows;
  },

  // 2. Ambil daftar dokumen di dalam folder tersebut
  getDocumentsInFolder: async (parentId) => {
    let query = `
                SELECT d.id_document, dv.file_name, dv.file_size, dv.created_at, dv.created_by, dv.approval_status
                FROM document d
                JOIN document_version dv ON d.id_document = dv.id_document
                WHERE d.id_folder IS NULL AND dv.is_active = true AND d.is_deleted = false
                ORDER BY dv.created_at DESC
            `;
    let params = [];
  
    
    if (parentId) {
      query = `
                    SELECT d.id_document, dv.file_name, dv.file_size, dv.created_at, dv.created_by, dv.approval_status
                    FROM document d
                    JOIN document_version dv ON d.id_document = dv.id_document
                    WHERE d.id_folder = $1 AND dv.is_active = true AND d.is_deleted = false
                    ORDER BY dv.created_at DESC
                `;
      params = [parentId];
    }

    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
   * Mengambil SEMUA dokumen yang berada di dalam folder
   */
  getAllDocumentsInFolderRecursive: async (parentId) => {
    let query = '';
    let params = [];
    
    if (parentId) {
      // Menggunakan RECURSIVE CTE untuk menelusuri pohon folder ke bawah
      query = `
        WITH RECURSIVE folder_tree AS (
            -- 1. Base Case: Ambil folder induk tempat kita mulai (Folder X)
            SELECT id_folder
            FROM folder
            WHERE id_folder = $1
            
            UNION ALL
            
            -- 2. Recursive Step: Ambil semua folder yang parent-nya ada di dalam hasil sebelumnya (Folder Y, Z, dst)
            SELECT f.id_folder
            FROM folder f
            INNER JOIN folder_tree ft ON f.parent_folder = ft.id_folder
        )
        -- 3. Main Query: Ambil dokumen yang id_folder-nya ada di dalam daftar folder_tree tadi
        SELECT 
            d.id_document, 
            dv.file_name, 
            dv.file_size, 
            dv.created_at, 
            dv.created_by, 
            dv.approval_status,
            d.id_folder -- Opsional: Untuk mengetahui dokumen ini aslinya ada di folder mana
        FROM document d
        JOIN document_version dv ON d.id_document = dv.id_document
        WHERE d.id_folder IN (SELECT id_folder FROM folder_tree)
          AND dv.is_active = true 
          AND d.is_deleted = false
        ORDER BY dv.created_at DESC
      `;
      params = [parentId];
    } else {
      // Jika parentId null (berada di Root utama), ambil dokumen yang tidak masuk folder manapun
      query = `
        SELECT 
            d.id_document, 
            dv.file_name, 
            dv.file_size, 
            dv.created_at, 
            dv.created_by, 
            dv.approval_status
        FROM document d
        JOIN document_version dv ON d.id_document = dv.id_document
        WHERE d.id_folder IS NULL 
          AND dv.is_active = true 
          AND d.is_deleted = false
        ORDER BY dv.created_at DESC
      `;
    }

    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
   * Mengambil detail lengkap dokumen berdasarkan ID-nya (Versi yang Aktif)
   */
  getDocumentById: async (idDocument) => {
    const query = `
            SELECT 
                d.id_document, 
                d.id_folder, 
                dv.file_name, 
                dv.file_name, 
                dv.file_size,
                dv.file_path,
                dv.custom_metadata, 
                dv.created_at, 
                dv.created_by, 
                dv.approval_status
            FROM document d
            JOIN document_version dv ON d.id_document = dv.id_document
            WHERE d.id_document = $1 AND dv.is_active = TRUE;
        `;
    const { rows } = await pool.query(query, [idDocument]);
    return rows[0]; // Akan undefined jika tidak ada
  },

  // Tambahkan fungsi ini di dalam DocumentModel
  getDocumentsByIds: async (documentIds) => {
    // Jika array ID kosong, langsung kembalikan array kosong agar tidak error di query
    if (!documentIds || documentIds.length === 0) {
      return [];
    }

    const query = `
      SELECT 
          d.id_document, 
          d.id_folder, 
          dv.file_name, 
          dv.file_name, 
          dv.file_size,
          dv.file_path,
          dv.custom_metadata, 
          dv.created_at, 
          dv.created_by, 
          dv.approval_status
      FROM document d
      JOIN document_version dv ON d.id_document = dv.id_document
      WHERE d.id_document = ANY($1) AND dv.is_active = TRUE;
    `;

    // Pastikan variabel koneksi db/pool Anda sesuai (misalnya db.query atau pool.query)
    const result = await pool.query(query, [documentIds]);
    return result.rows;
  },

  /**
   * Menambahkan versi baru dari sebuah dokumen
   */
  addDocumentRevision: async (
    idDocument,
    fileName,
    physicalFilename,
    fileSize,
    createdBy,
    fileFormat,
    customMetadata,
  ) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Matikan (Deactivate) versi lama yang sedang aktif
      await client.query(
        `
                UPDATE document_version 
                SET is_active = FALSE 
                WHERE id_document = $1 AND is_active = TRUE
            `,
        [idDocument],
      );

      // 2. Insert versi baru (version_number otomatis nambah 1 dari versi tertinggi)
      const insertQuery = `
                INSERT INTO document_version 
                (id_document, version_number, file_name, file_path, file_size, file_format, created_by, is_active, approval_status, created_at, custom_metadata)
                VALUES (
                    $1, 
                    (SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_version WHERE id_document = $1), 
                    $2, $3, $4, $5, $6, TRUE, 'DRAFT', NOW(), $7
                )
            `;
      const path = "uploads/" + physicalFilename;
      await client.query(insertQuery, [
        idDocument,
        fileName,
        path,
        fileSize,
        fileFormat,
        createdBy,
        customMetadata,
      ]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Melakukan pencarian berbasis Metadata (SQL ILIKE) dengan filter Hak Akses (ACL)
   */
  searchMetadata: async (idUser, keyword) => {
    // Kita tambahkan % agar bisa mencari kata di tengah kalimat (Wildcard)
    const searchPattern = `%${keyword}%`;

    const query = `
            SELECT DISTINCT 
                d.id_document, 
                d.id_folder, 
                dv.file_name, 
                dv.file_size, 
                dv.created_at, 
                dv.created_by, 
                dv.approval_status
            FROM document d
            JOIN document_version dv ON d.id_document = dv.id_document AND dv.is_active = TRUE
            -- Filter Pewarisan Hak Akses (ACL)
            LEFT JOIN permission p_doc ON p_doc.id_document = d.id_document AND p_doc.id_user = $1
            LEFT JOIN permission p_folder ON p_folder.id_folder = d.id_folder AND p_folder.id_user = $1
            WHERE 
                -- Syarat 1: User WAJIB punya hak preview
                (p_doc.preview = TRUE OR p_folder.preview = TRUE)
                AND 
                -- Syarat 2: Pencocokan keyword
                (
                    dv.file_name ILIKE $2
                    OR dv.created_by ILIKE $2
                    OR dv.custom_metadata::text ILIKE $2
                )
            ORDER BY dv.created_at DESC
            LIMIT 50; -- Batasi hasil pencarian agar performa tetap cepat
        `;

    const { rows } = await pool.query(query, [idUser, searchPattern]);
    return rows;
  },

  /**
   * Khusus Admin: Mengambil daftar semua dokumen yang ada di ROOT (tanpa folder)
   * tanpa terikat oleh aturan permission.
   */
  getDocumentsInRootForAdmin: async () => {
    const query = `
        SELECT 
            d.id_document, 
            dv.file_name, 
            dv.file_size, 
            dv.created_at, 
            dv.created_by, 
            dv.approval_status
        FROM document d
        JOIN document_version dv ON d.id_document = dv.id_document
        WHERE d.id_folder IS NULL 
          AND dv.is_active = true
          AND d.is_deleted = false
        ORDER BY dv.created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  deleteDocument: async (req, res) => {
    try {
      const docId = req.params.id;
      const userId = req.userId; // Dari middleware auth
      const userRole = req.role; // Dari middleware auth
      const name = req.name; // Dari middleware auth

      // 1. Ambil info dokumen untuk pengecekan hak akses
      const doc = await DocumentModel.getDocumentById(docId);
      if (!doc)
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });

      // 2. VALIDASI ATURAN BISNIS (Double-Layer Security)
      if (userRole !== "admin") {
        if (doc.created_by !== name) {
          return res.status(403).json({
            message: "Akses ditolak: Anda bukan pemilik dokumen ini.",
          });
        }
        if (
          doc.approval_status !== "DRAFT" &&
          doc.approval_status !== "REJECTED"
        ) {
          return res.status(403).json({
            message:
              "Aksi ilegal: Dokumen administrasi yang sedang direview atau sudah disetujui tidak boleh dihapus.",
          });
        }
      }

      // 3. Eksekusi Soft Delete
      await DocumentModel.softDelete(docId);

      // 4. Catat ke Audit Log! (Sangat penting)
      AuditModel.log(
        "DELETE",
        "DOCUMENT",
        userId,
        doc.id_folder,
        docId,
        "Memindahkan dokumen ke tempat sampah (Soft Delete)",
      );

      res
        .status(200)
        .json({ message: "Dokumen berhasil dipindahkan ke tempat sampah." });
    } catch (error) {
      console.error("Error deleting document:", error);
      res
        .status(500)
        .json({ message: "Terjadi kesalahan sistem saat menghapus dokumen." });
    }
  },

  // Mengambil riwayat versi berdasarkan id_document
  getDocumentVersions: async (documentId) => {
    const query = `
      SELECT id_version, version_number, file_name, file_size, approval_status, created_by, created_at, is_active
      FROM document_version
      WHERE id_document = $1
      ORDER BY version_number DESC
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows;
  },

  // Melakukan Rollback versi
  rollbackVersion: async (documentId, targetVersionId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Nonaktifkan versi yang saat ini sedang aktif
      await client.query(
        `
        UPDATE document_version 
        SET is_active = FALSE 
        WHERE id_document = $1
      `,
        [documentId],
      );

      // 2. Aktifkan versi target (Rollback) dan pastikan statusnya APPROVED agar langsung tayang
      const result = await client.query(
        `
        UPDATE document_version 
        SET is_active = TRUE
        WHERE id_version = $2 AND id_document = $1
        RETURNING *
      `,
        [documentId, targetVersionId],
      );

      await client.query("COMMIT");
      return result.rows[0]; // Kembalikan data versi yang baru saja diaktifkan
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  updateCustomMetadata: async (documentId, customMetadata, filename) => {
    // Kita ubah object javascript menjadi JSON string agar diterima oleh kolom JSONB PostgreSQL
    const metadataString = customMetadata
      ? JSON.stringify(customMetadata)
      : null;

    const query = `
      UPDATE document_version
      SET custom_metadata = $1, file_name = $3
      WHERE id_document = $2 AND is_active = TRUE
      RETURNING *;
    `;

    const values = [metadataString, documentId, filename];
    const result = await pool.query(query, values);

    return result.rows[0]; // Mengembalikan data versi yang berhasil diupdate
  },

  getDocumentMetadata: async (documentId) => {
    const query = `
      SELECT
        d.id_document,
        d.id_folder,
        av.file_name,
        av.file_size,
        av.version_number,
        av.custom_metadata,
        av.approval_status,
        COALESCE(creator.created_by, av.created_by) AS created_by,
        COALESCE(creator.created_at, av.created_at) AS created_at,
        COALESCE(last_update.updated_by, av.created_by) AS updated_by,
        COALESCE(last_update.updated_at, av.created_at) AS updated_at,
        COALESCE(f.folder_name, 'Root') AS folder_location
      FROM document d
      JOIN LATERAL (
        SELECT
          dv.file_name,
          dv.file_size,
          dv.version_number,
          dv.custom_metadata,
          dv.approval_status,
          dv.created_by,
          dv.created_at
        FROM document_version dv
        WHERE dv.id_document = d.id_document
          AND dv.is_active = TRUE
        ORDER BY dv.version_number DESC
        LIMIT 1
      ) av ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          dv.created_by,
          dv.created_at
        FROM document_version dv
        WHERE dv.id_document = d.id_document
        ORDER BY dv.created_at ASC, dv.version_number ASC
        LIMIT 1
      ) creator ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          a.timestamp AS updated_at,
          u.full_name AS updated_by
        FROM audit_log a
        LEFT JOIN "user" u ON u.id_user = a.id_user
        WHERE a.resource_type = 'DOCUMENT'
          AND a.id_document = d.id_document
          AND a.action IN ('UPLOAD', 'EDIT', 'UPDATE', 'ROLLBACK')
        ORDER BY a.timestamp DESC, a.id_log DESC
        LIMIT 1
      ) last_update ON TRUE
      LEFT JOIN folder f ON f.id_folder = d.id_folder
      WHERE d.id_document = $1
        AND d.is_deleted = false;
    `;

    const { rows } = await pool.query(query, [documentId]);
    return rows[0] ? rows[0] : null;
  },
};

module.exports = DocumentModel;
