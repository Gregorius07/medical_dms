const PDFParser = require("pdf2json");

/**
 * Mengekstrak judul dari PDF berdasarkan ukuran font terbesar di halaman pertama.
 * 
 * Cara kerja:
 * 1. Mem-parse file PDF menggunakan pdf2json library
 * 2. Mengambil halaman pertama dari dokumen PDF
 * 3. Mencari teks dengan ukuran font terbesar (biasanya merupakan judul)
 * 4. Jika ada teks dengan font size yang sama, gabungkan (untuk judul multi-baris)
 * 5. Return teks terpilih atau null jika tidak ada teks valid
 * 
 * @param {string} filePath - Path menuju file PDF fisik
 * @returns {Promise<string|null>} - Judul yang diekstrak atau null jika gagal atau tidak ada teks
 */
const extractTitleFromPdf = (filePath) => {
  return new Promise((resolve) => {
    // Inisialisasi PDF parser untuk mengolah file PDF
    const pdfParser = new PDFParser();

    // Event listener ketika terjadi error saat parsing PDF
    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("Gagal mem-parsing file:", errData.parserError);
      // Return null daripada error untuk menghindari crash aplikasi
      resolve(null); 
    });
    
    // Event listener ketika PDF berhasil di-parse
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        // Variabel untuk menyimpan ukuran font terbesar yang ditemukan
        let maxFontSize = 0;
        // Variabel untuk menyimpan teks dengan font terbesar
        let extractedTitle = "";

        // Ambil array halaman dari PDF (handle kedua format struktur data)
        const pages = pdfData?.formImage?.Pages || pdfData?.Pages;

        // Validasi: pastikan ada minimal 1 halaman
        if (!pages || pages.length === 0) {
          return resolve(null);
        }

        // Ambil halaman pertama (judul biasanya ada di halaman pertama)
        const firstPage = pages[0];

        // Validasi: pastikan halaman pertama memiliki teks
        if (!firstPage?.Texts || firstPage.Texts.length === 0) {
          return resolve(null);
        }
        
        // Loop melalui setiap elemen teks di halaman pertama
        firstPage.Texts.forEach((textItem, index) => {
          // Cek apakah textItem memiliki array run (R) yang berisi detail teks
          if (textItem?.R && textItem.R.length > 0) {
            // Ambil run (potongan) teks pertama dari textItem
            const run = textItem.R[0]; 
            // Decode URL-encoded text dan hapus whitespace di awal/akhir
            const textContent = decodeURIComponent(run.T).trim();

            // PERBAIKAN UTAMA: Cari array style (TS) yang berisi informasi format teks
            // TS bisa berada di dalam run (run.TS), textItem (textItem.TS), atau lowercase (textItem.ts)
            const styleArray = run.TS || textItem.TS || textItem.ts;
            
            // Ambil index ke 1 dari styleArray yang merupakan ukuran font (dalam satuan poin)
            const fontSize = (styleArray && styleArray.length > 1) ? styleArray[1] : 0;

            // Abaikan teks jika kosong atau font size-nya 0 (tidak ada informasi ukuran)
            if (!textContent || fontSize === 0) return;

            // HEURISTIK: Cari judul berdasarkan font terbesar
            // Asumsi: Judul memiliki ukuran font lebih besar dari teks normal
            if (fontSize > maxFontSize) {
              // Update maksimal font size dan set teks sebagai calon judul baru
              maxFontSize = fontSize;
              extractedTitle = textContent;
            } else if (fontSize === maxFontSize && maxFontSize > 0) {
              // Jika ditemukan teks dengan font size sama dengan maksimal
              // Gabungkan teksnya dengan spasi (biasanya judul ada di 2+ baris)
              extractedTitle += " " + textContent;
            }
          }
        });

        // Bersihkan whitespace berlebih dan return hasil akhir
        const finalTitle = extractedTitle.trim();
        
        // Return hasil akhir: judul jika ada, atau null jika tidak ada teks valid
        resolve(finalTitle || null);
      } catch (error) {
        // Handle unexpected error saat mengekstrak teks (biasanya data structure issue)
        console.error("[pdf2json] Terjadi kesalahan:", error.message);
        // Return null agar fungsi tetap berjalan tanpa error
        resolve(null); 
      }
    });

    // Load dan parse file PDF dari file system
    pdfParser.loadPDF(filePath);
  });
};

module.exports = extractTitleFromPdf;