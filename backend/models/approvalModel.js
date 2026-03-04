const pool = require('../config/db');
const AuditModel = require('../models/auditModel'); // Untuk mencatat ke audit log

class ApprovalModel {
    /**
     * Mengajukan permintaan approval baru
     */
    static async createRequest(idDocument, idRequester, approverEmail) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Cari ID Approver berdasarkan email
            const userQuery = `SELECT id_user FROM "user" WHERE email = $1 LIMIT 1;`;
            const userResult = await client.query(userQuery, [approverEmail]);
            if (userResult.rows.length === 0) throw new Error("Approver tidak ditemukan.");
            const idApprover = userResult.rows[0].id_user;

            // 2. Insert ke tabel approval_request
            const insertQuery = `
                INSERT INTO approval_request 
                (status, created_at, updated_at, id_requester, id_approver, id_document)
                VALUES ('PENDING', NOW(), NOW(), $1, $2, $3) RETURNING id_approval;
            `;
            await client.query(insertQuery, [idRequester, idApprover, idDocument]);

            // 3. Ubah status dokumen menjadi PENDING
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
                SELECT id_approval FROM approval_request 
                WHERE id_document = $1 AND id_approver = $2 AND status = 'PENDING' 
                ORDER BY created_at DESC LIMIT 1;
            `;
            const checkRes = await client.query(checkQuery, [idDocument, idApprover]);
            if (checkRes.rows.length === 0) throw new Error("Tidak ada permintaan approval yang valid untuk Anda.");
            const idApproval = checkRes.rows[0].id_approval;

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
            SELECT a.status, a.id_approver, u.name as approver_name 
            FROM approval_request a
            JOIN "user" u ON a.id_approver = u.id_user
            WHERE a.id_document = $1 AND a.status = 'PENDING'
            ORDER BY a.created_at DESC LIMIT 1;
        `;
        const { rows } = await pool.query(query, [idDocument]);
        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = ApprovalModel;