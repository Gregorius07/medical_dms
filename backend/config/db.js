require('dotenv').config(); // Load .env
const { Pool } = require('pg');

// Konfigurasi koneksi (mengambil dari .env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test koneksi saat aplikasi nyala
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Database connected successfully (Native pg)');
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: ()=> pool.connect(),
};