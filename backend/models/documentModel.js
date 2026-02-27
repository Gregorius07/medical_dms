const pool = require("../config/db");

const DocumentModel = {
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
                (version_number, file_name, file_format, file_size, custom_metadata, approval_status, created_by, is_active, id_document, id_folder,  created_at, file_path)
                VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, true, $7, $8, $9, $10)`,
        [
          1, // Versi pertama
          data.title, // Nama file fisik (UUID)
          data.fileFormat,
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

  // 2. Ambil SEMUA dokumen yang user punya hak akses SECARA LANGSUNG
  getAccessibleDocuments: async (userId) => {
    const query = `
            SELECT d.id_document, dv.file_name, dv.file_size, dv.created_at, dv.created_by, dv.approval_status,
                   p.preview, p.upload, p.download, p.edit_metadata
            FROM document d
            JOIN document_version dv ON d.id_document = dv.id_document
            JOIN permission p ON d.id_document = p.id_document
            WHERE p.id_user = $1 
              AND p.resource_type = 'DOCUMENT' 
              AND p.preview = TRUE 
              AND dv.is_active = true
            ORDER BY dv.created_at DESC;
        `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  // 2. Ambil daftar dokumen di dalam folder tersebut
  getDocumentsInFolder: async (parentId) => {
    let query = `
                SELECT d.id_document, dv.file_name, dv.file_size, dv.created_at, dv.created_by, dv.approval_status
                FROM document d
                JOIN document_version dv ON d.id_document = dv.id_document
                WHERE d.id_folder IS NULL AND dv.is_active = true
                ORDER BY dv.created_at DESC
            `;
    let params = [];

    if (parentId) {
      query = `
                    SELECT d.id_document, dv.file_name, dv.file_size, dv.created_at, dv.created_by, dv.approval_status
                    FROM document d
                    JOIN document_version dv ON d.id_document = dv.id_document
                    WHERE d.id_folder = $1 AND dv.is_active = true
                    ORDER BY dv.created_at DESC
                `;
      params = [parentId];
    }

    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
     * Mengambil detail lengkap dokumen berdasarkan ID-nya (Versi yang Aktif)
     */
  getDocumentById : async (idDocument) => {
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

    /**
     * Menambahkan versi baru dari sebuah dokumen
     */
    addDocumentRevision: async(idDocument, fileName, physicalFilename, fileSize, createdBy, fileFormat) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Matikan (Deactivate) versi lama yang sedang aktif
            await client.query(`
                UPDATE document_version 
                SET is_active = FALSE 
                WHERE id_document = $1 AND is_active = TRUE
            `, [idDocument]);

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
            const path = 'uploads/'+physicalFilename;
            await client.query(insertQuery, [idDocument, fileName, path, fileSize, fileFormat ,createdBy,{}]);

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }


};

module.exports = DocumentModel;
