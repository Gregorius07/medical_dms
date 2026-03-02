const pool = require('../config/db');

class AuditModel {
    /**
     * Mencatat aktivitas user ke dalam tabel audit_log
     * * @param {string} action - 'PREVIEW', 'UPLOAD', atau 'DOWNLOAD'
     * @param {string} resourceType - 'FOLDER' atau 'DOCUMENT'
     * @param {number} idUser - ID user yang melakukan aksi
     * @param {number|null} idFolder - ID folder yang terkait (jika ada)
     * @param {number|null} idDocument - ID dokumen yang terkait (jika ada)
     * @param {string} details - Catatan tambahan (opsional)
     */
    static async log(action, resourceType, idUser, idFolder = null, idDocument = null, details = '') {
        const query = `
            INSERT INTO audit_log 
            (action, resource_type, id_user, id_folder, id_document, details, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, NOW());
        `;
        const params = [action, resourceType, idUser, idFolder, idDocument, details];
        
        try {
            await pool.query(query, params);
        } catch (error) {
            // Kita hanya log error-nya saja ke server, 
            // jangan sampai error audit menggagalkan proses download/upload utama user.
            console.error("[AUDIT LOG ERROR] Gagal mencatat log:", error);
        }
    }

    static async getLogsByDocumentId(idDocument) {
        const query = `
            SELECT 
                a.id_log, 
                a.action, 
                a.details, 
                a.timestamp, 
                u.full_name as actor_name 
            FROM audit_log a
            LEFT JOIN "user" u ON a.id_user = u.id_user
            WHERE a.id_document = $1
            ORDER BY a.timestamp DESC
            LIMIT 50; -- Dibatasi 50 aktivitas terakhir agar tidak berat
        `;
        const { rows } = await pool.query(query, [idDocument]);
        return rows;
    }
}

module.exports = AuditModel;