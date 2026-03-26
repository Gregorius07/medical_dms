const { Client } = require('@elastic/elasticsearch');

// Buat instance client Elasticsearch yang mengarah ke localhost
const elasticClient = new Client({ 
    node: 'http://localhost:9200' 
});

// Fungsi untuk mengecek koneksi saat server berjalan
const checkElasticConnection = async () => {
    try {
        const info = await elasticClient.info();
        console.log(`✅ Elasticsearch Terhubung! (Versi: ${info.version.number})`);
    } catch (error) {
        console.error("❌ Gagal terhubung ke Elasticsearch:");
        console.error("Pastikan terminal Elasticsearch (elasticsearch.bat) sedang berjalan.");
        console.error(error.message);
    }
};

checkElasticConnection();

module.exports = elasticClient;