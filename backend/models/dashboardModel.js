const db = require('../config/db');

const DashboardModel = {
    getStats: async () => {
        // Jalankan query secara paralel agar performa maksimal
        const [docsRes, approvalRes, newDocsRes] = await Promise.all([
            db.query('SELECT COUNT(*) FROM document WHERE is_deleted = false'),
            db.query("SELECT COUNT(*) FROM approval_request WHERE status = 'PENDING'"),
            // Asumsi: menghitung dokumen aktif
            db.query("SELECT COUNT(*) FROM document_version WHERE is_active = true") 
        ]);

        return {
            totalDocuments: parseInt(docsRes.rows[0].count),
            pendingApproval: parseInt(approvalRes.rows[0].count),
            newDocuments: parseInt(newDocsRes.rows[0].count),
            expiredDocuments: 0 // Placeholder logika bisnis
        };
    }
};

module.exports = DashboardModel;