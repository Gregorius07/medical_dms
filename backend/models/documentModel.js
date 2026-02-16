const db = require('../config/db');

const DocumentModel = {
    // 1. GET ALL (Join dengan Version terbaru untuk dapat info file)
    getAll: async (search, limit, offset) => {
        let query = `
            SELECT d.id_document, d.file_name as title, f.folder_name,
                   v.file_name as physical_filename, v.version_number, v.file_size, v.created_by, v.approval_status,
                   v.created_at
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

        const data = await db.query(query, [...params, limit, offset]);
        
        // Count total untuk pagination
        const countRes = await db.query(`SELECT COUNT(*) FROM document WHERE is_deleted = false`);

        return {
            rows: data.rows,
            total: parseInt(countRes.rows[0].count)
        };
    },

    // 2. CREATE DOCUMENT (Transaction)
    create: async (data) => {
        
        try {
            await db.query('BEGIN');

            // A. Insert ke Tabel Dokumen (Wadah)
            const docRes = await db.query(
                `INSERT INTO document (file_name, id_folder) VALUES ($1, $2) RETURNING id_document`,
                [data.title, data.folderId || null]
            );
            const docId = docRes.rows[0].id_document;
            const now = new Date().toISOString();

            // B. Insert ke Tabel Version (File Fisik)
            await db.query(
                `INSERT INTO document_version 
                (version_number, file_name, file_format, file_size, custom_metadata, approval_status, created_by, is_active, id_document, id_folder,  created_at)
                VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, true, $7, $8, $9)`,
                [
                    1, // Versi pertama
                    data.storedFilename, // Nama file fisik (UUID)
                    data.fileFormat,
                    data.fileSize,
                    data.metadata || {}, 
                    data.uploader, // Nama user
                    docId,
                    data.folderId || null,
                    now
                ]
            );

            await db.query('COMMIT');
            return { id: docId, ...data };
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    },

    // 3. SOFT DELETE
    softDelete: async (id) => {
        return await db.query('UPDATE document SET is_deleted = true WHERE id_document = $1', [id]);
    }
};

module.exports = DocumentModel;