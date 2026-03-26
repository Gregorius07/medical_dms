const { Client } = require('@elastic/elasticsearch');

// 1. Buat instance client
const elasticClient = new Client({ 
    node: 'http://localhost:9200' 
});

// 2. Fungsi untuk membuat Index dengan spesifikasi NLP dari Anda
const initElasticIndex = async () => {
    const indexName = 'medical_documents'; // Nama tabel/index di Elasticsearch

    try {
        // Cek apakah index sudah pernah dibuat sebelumnya
        const indexExists = await elasticClient.indices.exists({ index: indexName });
        
        if (indexExists) {
            console.log(`ℹ️  Index Elasticsearch '${indexName}' sudah siap.`);
            return;
        }

        // Jika belum ada, kita buat index baru beserta Analyzer dan Mapping-nya
        await elasticClient.indices.create({
            index: indexName,
            settings: {
                // Konfigurasi Algoritma Okapi BM25 secara eksplisit
                similarity: {
                    default_bm25: {
                        type: "BM25",
                        b: 0.75,   // Parameter standar BM25
                        k1: 1.2    // Parameter standar BM25
                    }
                },
                analysis: {
                    // Mendefinisikan filter tambahan (Stopword & Stemming Snowball)
                    filter: {
                        english_stop: {
                            type: "stop",
                            stopwords: "_english_"
                        },
                        english_snowball: {
                            type: "snowball",
                            language: "English"
                        }
                    },
                    // Merakit semua komponen menjadi satu Analyzer kustom
                    analyzer: {
                        custom_english_analyzer: {
                            type: "custom",
                            tokenizer: "standard",
                            filter: [
                                "lowercase",         // 1. Ubah ke huruf kecil
                                "english_stop",      // 2. Buang stopword
                                "english_snowball"   // 3. Lakukan stemming
                            ]
                        }
                    }
                }
            },
            mappings: {
                properties: {
                    id_document: { type: "integer" },
                    title: { 
                        type: "text", 
                        analyzer: "custom_english_analyzer", // Gunakan analyzer kustom di sini
                        similarity: "default_bm25"
                    },
                    content: { 
                        type: "text", 
                        analyzer: "custom_english_analyzer", // Gunakan analyzer kustom di sini
                        similarity: "default_bm25"
                    },
                    uploader: { type: "keyword" }, // Keyword berarti pencarian kata persis (tidak di-stemming)
                    created_at: { type: "date" }
                }
            }
        });

        console.log(`✅ Index '${indexName}' berhasil dibuat dengan Custom Analyzer & BM25!`);
    } catch (error) {
        console.error("❌ Gagal membuat index Elasticsearch:", error.message);
    }
};

// 3. Fungsi untuk mengecek koneksi dan menjalankan inisialisasi
const startElastic = async () => {
    try {
        const info = await elasticClient.info();
        console.log(`✅ Elasticsearch Terhubung! (Versi: ${info.version.number})`);
        
        // Panggil fungsi pembuatan index setelah berhasil terhubung
        await initElasticIndex();
    } catch (error) {
        console.error("❌ Gagal terhubung ke Elasticsearch. Pastikan server berjalan.");
    }
};

startElastic();

module.exports = elasticClient;