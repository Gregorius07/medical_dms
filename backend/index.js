const express = require('express');
const cors = require('cors'); //biar fe bisa konek ke be
const bodyParser = require('body-parser'); //untuk baca data json
const cookieParser = require('cookie-parser');

// Import Routes
const positionRoutes = require('./routes/positionRoutes');
const authRoutes = require('./routes/authRoutes');         
const dashboardRoutes = require('./routes/dashboardRoutes');
const departmentRoutes = require('./routes/departmentRoutes'); 
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = 5000; //port server
const path = require('path');

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true //biar cookie bisa lewat
})); //pake ini untuk request yang masuk
app.use(bodyParser.json()); //ngubah json ke objek js (req.body)
app.use(cookieParser()); //biar backend bisa baca req.cookies

// ubah ke string UNTUK BIGINT (Supaya JSON tidak error saat baca ID User dari postgre) ---
BigInt.prototype.toJSON = function() { return this.toString() }

// Buat folder uploads bisa diakses publik lewat URL http://localhost:5000/uploads/...
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register Routes (semua di dalam ..routes akan dapet /api di depannya)
app.use('/api', authRoutes);                  // Akses: POST /api/login
app.use('/api/dashboard', dashboardRoutes);   // Akses: GET /api/dashboard/stats
app.use('/api/positions', positionRoutes);    // Akses: GET /api/positions
app.use('/api/departments', departmentRoutes);
app.use('/api/users',userRoutes);
app.use('/api/documents', documentRoutes);
// Root Endpoint
app.get('/', (req, res) => {
    res.json({ message: "MedAdmin API is Running (MVC Version)" });
});

//server dimulai
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});