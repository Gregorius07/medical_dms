const PDFParser = require("pdf2json");

/**
 * Mengekstrak judul dari PDF berdasarkan ukuran font terbesar di halaman pertama.
 * @param {string} filePath - Path menuju file PDF fisik
 * @returns {Promise<string|null>} - Judul yang diekstrak atau null jika gagal
 */
const extractTitleFromPdf = (filePath) => {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("Gagal mem-parsing file:", errData.parserError);
      resolve(null); 
    });
    
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        let maxFontSize = 0;
        let extractedTitle = "";

        const pages = pdfData?.formImage?.Pages || pdfData?.Pages;

        if (!pages || pages.length === 0) {
          return resolve(null);
        }

        const firstPage = pages[0];

        if (!firstPage?.Texts || firstPage.Texts.length === 0) {
          return resolve(null);
        }
        firstPage.Texts.forEach((textItem, index) => {
          if (textItem?.R && textItem.R.length > 0) {
            const run = textItem.R[0]; // Ambil potongan teks pertama
            const textContent = decodeURIComponent(run.T).trim();

            // PERBAIKAN UTAMA: Cari array format di TS (kapital) di dalam R, atau di luar
            const styleArray = run.TS || textItem.TS || textItem.ts;
            
            // Ambil index ke-1 dari styleArray yang merupakan ukuran font
            const fontSize = (styleArray && styleArray.length > 1) ? styleArray[1] : 0;

            // Abaikan jika kosong atau ukurannya 0
            if (!textContent || fontSize === 0) return;

            // Heuristik mencari judul berdasarkan font terbesar
            if (fontSize > maxFontSize) {
              maxFontSize = fontSize;
              extractedTitle = textContent;
            } else if (fontSize === maxFontSize && maxFontSize > 0) {
              // Jika font sama besar, gabungkan teksnya (biasanya judul 2 baris)
              extractedTitle += " " + textContent;
            }
          }
        });

        const finalTitle = extractedTitle.trim();
        
        resolve(finalTitle || null);
      } catch (error) {
        console.error("[pdf2json] Terjadi kesalahan:", error.message);
        resolve(null); 
      }
    });

    pdfParser.loadPDF(filePath);
  });
};

module.exports = extractTitleFromPdf;