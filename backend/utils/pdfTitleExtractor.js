const PDFParser = require("pdf2json");

/**
 * Mengekstrak judul dari PDF berdasarkan ukuran font terbesar di halaman pertama.
 * 
 * urutan
 * 1.parse file PDF menggunakan pdf2json library
 * 2. halaman pertama dari dokumen PDF
 * 3. cari teks dengan ukuran font terbesar (biasanya merupakan judul)
 * 4. kalo ada teks dengan font size yang sama, gabungkan (untuk judul multi-baris)
 * 5. return teks terpilih atau null jika tidak ada teks valid
 */

// Halaman (Page)
// └── Texts[]          ← array semua elemen teks di halaman
//     └── TextItem
//         ├── x, y     ← posisi teks
//         └── R[]      ← "Runs" = potongan teks dengan style berbeda
//             └── Run
//                 ├── T    ← teks aktual (URL-encoded)
//                 └── TS[] ← "Text Style" = array informasi styling
//                     ├── [0] = font face index
//                     ├── [1] = font size ← yang dipakai di kode
//                     ├── [2] = bold (1/0)
//                     └── [3] = italic (1/0)

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

        // Ambil array halaman dari PDF
        const pages = pdfData?.formImage?.Pages || pdfData?.Pages;

        console.log("[LOG] Struktur pdfData:", JSON.stringify(Object.keys(pdfData), null, 2));
    console.log("[LOG] Jumlah halaman:", pages?.length);

        // pastikan ada minimal 1 halaman
        if (!pages || pages.length === 0) {
          return resolve(null);
        }

        // Ambil halaman pertama
        const firstPage = pages[0]; //page

        console.log("[LOG] Jumlah TextItem di halaman 1:", firstPage?.Texts?.length);

        // pastikan halaman pertama memiliki teks
        if (!firstPage?.Texts || firstPage.Texts.length === 0) {
          return resolve(null);
        }
        
        // Loop melalui setiap elemen teks di halaman pertama
        firstPage.Texts.forEach((textItem, index) => {
          // Cek apakah textItem memiliki array run (R) yang berisi detail teks dengan style berbeda
          if (textItem?.R && textItem.R.length > 0) { 
            const run = textItem.R[0]; // Ambil run 
            const textContent = decodeURIComponent(run.T).trim(); // Decode URL-encoded text (seperti %3D, %20) dan hapus whitespace di awal/akhir
            const styleArray = run.TS || textItem.TS || textItem.ts;// ambil TS (Text Style) dari run atau textItem, karena kadang TS ada di run, kadang di textItem
            const fontSize = (styleArray && styleArray.length > 1) ? styleArray[1] : 0;// Ambil index ke 1 dari styleArray yang merupakan ukuran font (dalam satuan poin)

            console.log(`[LOG] TextItem[${index}] | fontSize: ${fontSize} | TS: ${JSON.stringify(styleArray)} | teks: "${textContent}"`);

            // Abaikan teks jika kosong atau font size-nya 0 (tidak ada informasi ukuran)
            if (!textContent || fontSize === 0) return;

            // Cari judul berdasarkan font terbesar
            // dengan asumsi judul memiliki ukuran font lebih besar dari teks normal
            if (fontSize > maxFontSize) {
              // Update maksimal font size dan set teks sebagai calon judul baru
              maxFontSize = fontSize;
              extractedTitle = textContent;
            } else if (fontSize === maxFontSize && maxFontSize > 0) {
              // Jika ditemukan teks dengan font size sama dengan maksimal
              // Gabungkan teksnya dengan spasi 
              extractedTitle += " " + textContent;
            }
          }
        });

        // Bersihkan whitespace berlebih dan return hasil akhir
        const finalTitle = extractedTitle.trim();
        console.log(`[LOG] maxFontSize: ${maxFontSize} | finalTitle: "${finalTitle}"`);
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

