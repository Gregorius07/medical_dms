const jwt = require('jsonwebtoken');

const verifyToken = (req,res,next) => {
    //ngambil token dari cookies di browser
    
    const token = req.cookies.token;
    //cek token
    if (!token) {
        return res.status(401).json({message: "Anda belum login!"})
    }

    try{
        //verifikasi token
        const decoded = jwt.verify(token, 'secret');
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