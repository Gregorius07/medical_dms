const UserModel = require('../models/userModel');

const AuthController = {
    login: async (req, res) => {
        const { email, password } = req.body;

        try {
            //panggil Model untuk cari user
            const user = await UserModel.findByUsername(email);

            //cek Password
            if (user && user.password === password) {
                return res.status(200).json({
                    success: true,
                    message: "Login berhasil",
                    token: "mock-jwt-token-mvc", 
                    user: {
                        id: user.id_user,
                        name: user.full_name,
                        role: user.is_admin ? "Administrator" : "User",
                        position: user.position_name,
                        department: user.department_name
                    }
                });
            }

            return res.status(401).json({
                success: false,
                message: "Username atau password salah"
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Terjadi kesalahan server" });
        }
    }
};

module.exports = AuthController;