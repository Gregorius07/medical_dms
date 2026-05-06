const pool = require('../config/db');
const AuditModel = require('../models/auditModel'); // Untuk mencatat ke audit log

class ApprovalModel {
    /**
     * Mengajukan permintaan approval baru
     */
    static async createRequest(idDocument, idRequester, approverFullname, isAutomatic = false, idTargetFolder = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Cari ID Approver berdasarkan fullname
            const userQuery = `SELECT id_user FROM "user" WHERE full_name = $1 LIMIT 1;`;
            const userResult = await client.query(userQuery, [approverFullname]);
            if (userResult.rows.length === 0) throw new Error("Approver tidak ditemukan.");
            const idApprover = userResult.rows[0].id_user;

            // 2. Validasi: Jika isAutomatic=true, maka idTargetFolder harus ada
            if (isAutomatic && !idTargetFolder) {
                throw new Error("Target folder harus dipilih untuk approval otomatis.");
            }

            // 3. Insert ke tabel approval_request
            const insertQuery = `
                INSERT INTO approval_request 
                (status, created_at, updated_at, id_requester, id_approver, id_document, id_target_folder)
                VALUES ('PENDING', NOW(), NOW(), $1, $2, $3, $4) RETURNING id_approval;
            `;
            await client.query(insertQuery, [idRequester, idApprover, idDocument, isAutomatic ? idTargetFolder : null]);

            // 4. Ubah status dokumen menjadi PENDING
            await client.query(`
                UPDATE document_version 
                SET approval_status = 'PENDING' 
                WHERE id_document = $1 AND is_active = TRUE;
            `, [idDocument]);

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Merespons permintaan (Approve / Reject)
     */
    static async respondRequest(idDocument, idApprover, responseStatus, notes) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Cari request PENDING yang ditujukan untuk user ini pada dokumen ini
            const checkQuery = `
                SELECT id_approval, id_target_folder FROM approval_request 
                WHERE id_document = $1 AND id_approver = $2 AND status = 'PENDING' 
                ORDER BY created_at DESC LIMIT 1;
            `;
            const checkRes = await client.query(checkQuery, [idDocument, idApprover]);
            if (checkRes.rows.length === 0) throw new Error("Tidak ada permintaan approval yang valid untuk Anda.");
            const idApproval = checkRes.rows[0].id_approval;
            const idTargetFolder = checkRes.rows[0].id_target_folder;

            // 2. Update status di tabel approval_request
            const updateApproval = `
                UPDATE approval_request 
                SET status = $1, notes = $2, updated_at = NOW() 
                WHERE id_approval = $3;
            `;
            await client.query(updateApproval, [responseStatus, notes, idApproval]);

            // 3. Update status di tabel dokumen
            await client.query(`
                UPDATE document_version 
                SET approval_status = $1 
                WHERE id_document = $2 AND is_active = TRUE;
            `, [responseStatus, idDocument]);

            // 4. JIKA APPROVED DAN ADA TARGET FOLDER: Pindahkan dokumen
            if (responseStatus === 'APPROVED' && idTargetFolder) {
                // Pindahkan dokumen (document) ke folder target
                await client.query(`
                    UPDATE document 
                    SET id_folder = $1 
                    WHERE id_document = $2;
                `, [idTargetFolder, idDocument]);

                // Pindahkan semua document_version ke folder target
                await client.query(`
                    UPDATE document_version 
                    SET id_folder = $1 
                    WHERE id_document = $2;
                `, [idTargetFolder, idDocument]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Cek apakah ada approval PENDING untuk dokumen ini, dan siapa approver-nya
     */
    static async getActiveApprovalInfo(idDocument) {
        const query = `
            SELECT 
                a.status, 
                a.id_approver, 
                u_approver.full_name as approver_name,
                a.id_requester,
                u_requester.full_name as requester_name,
                a.notes,
                a.id_target_folder,
                f.folder_name as target_folder_name
            FROM approval_request a
            -- Join pertama untuk mengambil data Approver
            JOIN "user" u_approver ON a.id_approver = u_approver.id_user
            -- Join kedua untuk mengambil data Requester
            JOIN "user" u_requester ON a.id_requester = u_requester.id_user
            -- Left join untuk folder target (optional)
            LEFT JOIN folder f ON a.id_target_folder = f.id_folder
            WHERE a.id_document = $1
            ORDER BY a.created_at DESC LIMIT 1;
        `;
        const { rows } = await pool.query(query, [idDocument]);
        return rows.length > 0 ? rows[0] : null;
    }

    // 1. INBOX: Dokumen yang menunggu persetujuan SAYA (Saya sebagai Approver)
    static async getInbox(userId) {
        const query = `
            SELECT 
                a.id_approval, a.status, a.created_at as request_date, a.notes,
                d.id_document, 
                dv.file_name, dv.file_size,
                u_req.full_name AS requester_name
            FROM approval_request a
            JOIN document d ON a.id_document = d.id_document
            JOIN document_version dv ON d.id_document = dv.id_document AND dv.is_active = TRUE
            JOIN "user" u_req ON a.id_requester = u_req.id_user
            WHERE a.id_approver = $1 AND a.status = 'PENDING'
            ORDER BY a.created_at DESC;
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows;
    }

    // 2. OUTBOX: Dokumen yang SAYA ajukan dan sedang menunggu jawaban (Saya sebagai Requester)
    static async getOutbox(userId) {
        const query = `
            SELECT 
                a.id_approval, a.status, a.created_at as request_date, a.notes,
                d.id_document, 
                dv.file_name, dv.file_size,
                u_app.full_name AS approver_name
            FROM approval_request a
            JOIN document d ON a.id_document = d.id_document
            JOIN document_version dv ON d.id_document = dv.id_document AND dv.is_active = TRUE
            JOIN "user" u_app ON a.id_approver = u_app.id_user
            WHERE a.id_requester = $1 AND a.status = 'PENDING'
            ORDER BY a.created_at DESC;
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows;
    }

    // 3. HISTORY: Riwayat persetujuan yang sudah SELESAI (Baik yang saya ajukan maupun yang saya setujui/tolak)
    static async getHistory(userId) {
        const query = `
            SELECT 
                a.id_approval, a.status, a.created_at as request_date, a.notes,
                d.id_document, 
                dv.file_name, dv.file_size,
                u_req.full_name AS requester_name,
                u_app.full_name AS approver_name
            FROM approval_request a
            JOIN document d ON a.id_document = d.id_document
            JOIN document_version dv ON d.id_document = dv.id_document AND dv.is_active = TRUE
            JOIN "user" u_req ON a.id_requester = u_req.id_user
            JOIN "user" u_app ON a.id_approver = u_app.id_user
            WHERE (a.id_approver = $1 OR a.id_requester = $1)
              AND a.status IN ('APPROVED', 'REJECTED')
            ORDER BY a.created_at DESC;
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows;
    }
}

module.exports = ApprovalModel;