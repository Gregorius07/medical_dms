const jwt = require('jsonwebtoken');

const verifyToken = (req,res,next) => {
    
    //ngambil token dari cookies di browser
    const token = req.cookies.token;
    //cek token
    if (!token) {
        return res.status(401).json({message: "Anda belum login!"})
    }

    //kalau ada token, lanjut ke verifikasi
    try{ 
        //verifikasi token
        const decoded = jwt.verify(token, 'secret'); //pakai secret key yang sama dengan yang dipakai saat membuat token
        //ngambil data user dari payload token dan simpan di req.userId, req.name, req.role
        req.userId = decoded.id;
        req.name = decoded.name;
        req.role = decoded.role;
        next();
    }catch(error){
        res.status(403).json({
            message: "Sesi Anda telah habis (Expired) atau tidak valid."
        })
    }
}

module.exports = {verifyToken};