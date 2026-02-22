const pool = require('../config/db');

class PermissionModel {
    // 1. Fungsi untuk memberikan akses penuh (Draft) ke suatu folder
    static async createFolderPermission(idUser, idFolder, createdBy) {
        const query = `
            INSERT INTO permission 
            (preview, download, upload, edit_metadata, resource_type, created_at, created_by, id_user, id_folder)
            VALUES 
            (TRUE, TRUE, TRUE, TRUE, 'FOLDER', NOW(), $1, $2, $3)
            RETURNING id_permission;
        `;
        // Nilai $1=createdBy, $2=idUser, $3=idFolder
        const { rows } = await pool.query(query, [createdBy, idUser, idFolder]);
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
}

module.exports = PermissionModel;