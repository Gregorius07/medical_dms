const pool = require('../config/db');

class FolderModel {
    // 1. Ambil daftar sub-folder
    static async getSubFolders(parentId) {
        let query = `SELECT * FROM folder WHERE parent_folder IS NULL ORDER BY folder_name ASC`;
        let params = [];

        if (parentId) {
            query = `SELECT * FROM folder WHERE parent_folder = $1 ORDER BY folder_name ASC`;
            params = [parentId];
        }

        const { rows } = await pool.query(query, params);
        return rows;
    }

    // 2. Ambil daftar dokumen di dalam folder tersebut
    static async getDocumentsInFolder(parentId) {
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
    }

    // 3. Ambil breadcrumbs (seluruh isi folder tersebut)
    static async getBreadcrumbs(folderId) {
        const query = `
            WITH RECURSIVE folder_tree AS (
                SELECT id_folder, folder_name, parent_folder, 1 AS level
                FROM folder
                WHERE id_folder = $1
                
                UNION ALL
                
                SELECT f.id_folder, f.folder_name, f.parent_folder, ft.level + 1
                FROM folder f
                JOIN folder_tree ft ON f.id_folder = ft.parent_folder
            )
            SELECT id_folder, folder_name 
            FROM folder_tree 
            ORDER BY level DESC;
        `;
        const { rows } = await pool.query(query, [folderId]);
        return rows;
    }

    static async createFolder(folderName, createdBy, parentFolder = null, client) {
        const query = `
            INSERT INTO folder (folder_name, metadata_schema, created_by, parent_folder)
            VALUES ($1, $2, $3, $4)
            RETURNING id_folder, folder_name;
        `;
        // metadata_schema kita isi '{}' (kosong) sebagai default untuk folder draft
        const metadataSchema = JSON.stringify({}); 
        
        const { rows } = await client.query(query, [folderName, metadataSchema, createdBy, parentFolder]);
        return rows[0]; // Mengembalikan data folder yang baru dibuat (termasuk id_folder-nya)
    }
}

module.exports = FolderModel;