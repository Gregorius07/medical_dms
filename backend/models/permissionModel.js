const pool = require('../config/db');

class PermissionModel {
    // 1. Fungsi untuk memberikan akses penuh (Draft) ke suatu folder
    static async createFolderPermission(idUser, idFolder, createdBy, client) {
        const query = `
            INSERT INTO permission 
            (preview, download, upload, edit_metadata, resource_type, created_at, created_by, id_user, id_folder)
            VALUES 
            (TRUE, TRUE, TRUE, TRUE, 'FOLDER', NOW(), $1, $2, $3)
            RETURNING id_permission;
        `;
        // Nilai $1=createdBy, $2=idUser, $3=idFolder
        const { rows } = await client.query(query, [createdBy, idUser, idFolder]);
        return rows[0];
    }

    // 2. Fungsi untuk mencari tahu mana "Folder Draft" milik user ini
    // Logika: Cari permission milik user ini, untuk resource FOLDER, 
    // di mana foldernya tidak punya parent (NULL / root) dan namanya mengandung kata "Draft".
    static async getUserDraftFolder(idUser) {
        const query = `
            SELECT p.id_folder, f.folder_name 
            FROM permission p
            JOIN folder f ON p.id_folder = f.id_folder
            WHERE p.id_user = $1 
              AND p.resource_type = 'FOLDER' 
              AND f.parent_folder IS NULL
              AND f.folder_name LIKE 'Draft - %'
            LIMIT 1;
        `;
        const { rows } = await pool.query(query, [idUser]);
        return rows[0]; // Akan mengembalikan { id_folder: X, folder_name: '...' }
    }

    /**
     * Mengecek apakah user memiliki hak akses tertentu pada sebuah resource
     * @param {number} idUser - ID User yang sedang login
     * @param {number} resourceId - ID Folder atau ID Dokumen
     * @param {string} resourceType - 'FOLDER' atau 'DOCUMENT'
     * @param {string} action - 'preview', 'download', 'upload', atau 'edit_metadata'
     * @returns {boolean} - true jika diizinkan, false jika ditolak
     */
    static async checkAccess(idUser, resourceId, resourceType, action) {
        // Mencegah SQL Injection pada nama kolom
        const validActions = ['preview', 'download', 'upload', 'edit_metadata'];
        if (!validActions.includes(action)) throw new Error("Aksi tidak valid");

        // Tentukan kolom mana yang akan dicocokkan berdasarkan tipe resource
        const idColumn = resourceType === 'FOLDER' ? 'id_folder' : 'id_document';

        const query = `
            SELECT ${action} 
            FROM permission 
            WHERE id_user = $1 AND ${idColumn} = $2 AND resource_type = $3
            LIMIT 1;
        `;

        const { rows } = await pool.query(query, [idUser, resourceId, resourceType]);

        // Jika data tidak ditemukan, atau nilainya FALSE, berarti akses ditolak
        if (rows.length === 0) return false;
        
        return rows[0][action] === true;
    }

    static async checkMultipleAccess(idUser, resourceIds, resourceType, action) {
        const validActions = ['preview', 'download', 'upload', 'edit_metadata'];
        if (!validActions.includes(action)) throw new Error("Aksi tidak valid");

        const idColumn = resourceType === 'FOLDER' ? 'id_folder' : 'id_document';
        
        // Hilangkan duplikat ID jika frontend tidak sengaja mengirim ID ganda
        const uniqueIds = [...new Set(resourceIds)];

        // Gunakan ANY($3::int[]) untuk mengecek array di PostgreSQL
        const query = `
            SELECT COUNT(DISTINCT ${idColumn}) as granted_count
            FROM permission 
            WHERE id_user = $1 
              AND resource_type = $2 
              AND ${idColumn} = ANY($3::int[]) 
              AND ${action} = TRUE;
        `;

        const { rows } = await pool.query(query, [idUser, resourceType, uniqueIds]);

        // Jika jumlah baris yang diizinkan SAMA dengan jumlah ID yang diminta, maka TRUE
        return parseInt(rows[0].granted_count) === uniqueIds.length;
    }
}

module.exports = PermissionModel;