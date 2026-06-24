const UserModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12;

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
      //panggil Model untuk cari user
      const user = await UserModel.findByUsername(email);

      //cek Password
      if (user && await bcrypt.compare(password, user.password)) {
        //buat jwt token
        const token = jwt.sign(
          {//payload
            id: user.id_user, 
            name: user.full_name,
            role: user.is_admin? "admin" : "user"
          },
          "secret", //secret key
          {
            expiresIn: "2h", //batas waktu token berlaku
          },
        );

        // console.log("Sebelum token dibuat:");
        // console.log(token);

        res.cookie("token", token, {
          httpOnly: true, //biar token gak bisa diakses lewat JavaScript (XSS protection)
          secure: false, //http biasa, bukan https
          sameSite: "lax", //biar bisa dipakai di localhost
          maxAge: 2 * 60 * 60 * 1000,
        });

        // console.log("setelah token dibuat:");
        // console.log(token);

        return res.status(200).json({
          success: true,
          message: "Login berhasil",
          user: {
            id: user.id_user,
            name: user.full_name,
            role: user.is_admin ? "admin" : "user",
            position: user.position_name,
            department: user.department_name,
          },
        });
      }

      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Terjadi kesalahan server" });
    }
  }

const getMe = async (req, res) => {
  try {
    const userId = req.userId;
    
    //cek data user
    const userData = await UserModel.findById(userId);

    res.json({
      id: userData.id_user,
      name: userData.full_name,
      role: userData.is_admin ? "admin" : "user",
      position: userData.position_name,
      department: userData.department_name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const logout = (req, res) => {
    res.clearCookie('token'); // hapus cookie saat logout
    console.log("token berhasil dihapus");
    res.json({ message: "Logout berhasil" });
};

module.exports = {login, getMe, logout};
