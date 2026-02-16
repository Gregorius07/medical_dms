const db = require('../config/db');

const requireAdmin = async (req, res, next) => {
    //Ambil ID user dari Header (Simulasi Token)
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized: Silakan login" });
    }

    try {
        // Cek ke Database apakah user ini Admin
        const query = 'SELECT is_admin FROM "user" WHERE id_user = $1';
        const result = await db.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "User tidak ditemukan" });
        }

        const user = result.rows[0];

        if (user.is_admin) {
            // 3. Jika Admin, lanjut ke Controller
            next();
        } else {
            // 4. Jika Bukan Admin, tolak
            return res.status(403).json({ message: "Forbidden: Akses khusus Admin" });
        }
    } catch (err) {
        return res.status(500).json({ message: "Server Error saat cek hak akses" });
    }
};

module.exports = { requireAdmin };