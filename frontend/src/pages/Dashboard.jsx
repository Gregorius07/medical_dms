import { createSignal, onMount, createEffect } from "solid-js";
import api from "../api";

function Dashboard() {
  const [stats, setStats] = createSignal({});
  const [documents, setDocuments] = createSignal([]);
  
  // State Upload
  const [isUploadOpen, setIsUploadOpen] = createSignal(false);
  const [uploadFile, setUploadFile] = createSignal(null);
  const [docTitle, setDocTitle] = createSignal("");
  const [uploadLoading, setUploadLoading] = createSignal(false);

  // User Session (Untuk tahu siapa uploader)
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
    } catch(err) { console.error(err) }
  };

  const fetchDocuments = async () => {
    try {
      // Ambil 10 dokumen terbaru
      const res = await api.get("/documents?page=1&size=10");
      setDocuments(res.data.data);
    } catch(err) { console.error(err) }
  };

  onMount(() => {
    fetchStats();
    fetchDocuments();
  });

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
    // Otomatis isi judul dari nama file jika judul kosong
    if (!docTitle() && e.target.files[0]) {
        setDocTitle(e.target.files[0].name);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile()) return alert("Pilih file dulu!");

    setUploadLoading(true);
    
    // Gunakan FormData untuk upload file
    const formData = new FormData();
    formData.append("file", uploadFile());
    formData.append("title", docTitle());
    formData.append("uploaderName", user.name || "Admin");
    // formData.append("folderId", selectedFolder); // Nanti jika ada fitur folder

    try {
        await api.post("/documents", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        alert("Upload Berhasil!");
        setIsUploadOpen(false);
        setUploadFile(null);
        setDocTitle("");
        
        // Refresh data
        fetchStats();
        fetchDocuments();
    } catch (err) {
        alert("Upload Gagal: " + (err.response?.data?.message || err.message));
    } finally {
        setUploadLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Hapus dokumen ini?")) return;
    try {
        await api.delete(`/documents/${id}`);
        fetchDocuments();
        fetchStats();
    } catch (err) { alert("Gagal hapus"); }
  };

  const handleDownload = (filename) => {
    // Buka file di tab baru (Backend menyajikan static file di /uploads)
    window.open(`http://localhost:5000/uploads/${filename}`, '_blank');
  };

  return (
    <div>
        {/* STATS CARDS (Sama seperti sebelumnya) */}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p class="text-gray-500 text-sm mb-2">Total Documents</p>
                <h3 class="text-3xl font-bold text-gray-800">{stats().totalDocuments || 0}</h3>
            </div>
             <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p class="text-gray-500 text-sm mb-2">Pending Approval</p>
                <h3 class="text-3xl font-bold text-gray-800">{stats().pendingApproval || 0}</h3>
            </div>
             <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p class="text-gray-500 text-sm mb-2">New Documents</p>
                <h3 class="text-3xl font-bold text-gray-800">{stats().newDocuments || 0}</h3>
            </div>
        </div>

        {/* SECTION DOKUMEN */}
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-gray-800 text-lg">Newest Document</h3>
                <button 
                    onClick={() => setIsUploadOpen(true)}
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <span class="text-lg">+</span> Upload Document
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                        <tr>
                            <th class="px-4 py-3">Document Title</th>
                            <th class="px-4 py-3">Uploader</th>
                            <th class="px-4 py-3">Status</th>
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm">
                        {documents().length === 0 ? (
                            <tr><td colspan="5" class="text-center py-6 text-gray-400">No documents yet</td></tr>
                        ) : (
                            documents().map((doc) => (
                                <tr class="border-b last:border-0 hover:bg-gray-50">
                                    <td class="px-4 py-3 font-medium text-gray-800">
                                        {doc.title}
                                        <div class="text-xs text-gray-400">{doc.file_size} bytes • {doc.folder_name || 'Root'}</div>
                                    </td>
                                    <td class="px-4 py-3">{doc.created_by}</td>
                                    <td class="px-4 py-3">
                                        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                                            {doc.approval_status}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-gray-500">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </td>
                                    <td class="px-4 py-3 text-right space-x-2">
                                        <button 
                                            onClick={() => handleDownload(doc.physical_filename)}
                                            class="text-blue-600 hover:underline text-xs"
                                        >
                                            Download
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(doc.id_document)}
                                            class="text-red-500 hover:text-red-700 text-xs"
                                        >
                                            Hapus
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL UPLOAD */}
        {isUploadOpen() && (
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-xl shadow-lg w-[500px] p-6">
                    <h3 class="text-lg font-bold mb-4">Upload New Document</h3>
                    <form onSubmit={handleUpload} class="space-y-4">
                        
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
                            <input type="file" onChange={handleFileChange} class="hidden" id="fileInput" />
                            <label for="fileInput" class="cursor-pointer">
                                <div class="text-blue-600 font-medium mb-1">Click to select file</div>
                                <div class="text-xs text-gray-400">PDF, DOCX, XLS (Max 10MB)</div>
                                {uploadFile() && (
                                    <div class="mt-2 text-sm text-green-600 font-bold bg-green-50 py-1 px-2 rounded">
                                        {uploadFile().name}
                                    </div>
                                )}
                            </label>
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Document Title</label>
                            <input 
                                type="text" 
                                required 
                                class="w-full border rounded-lg px-3 py-2 text-sm"
                                value={docTitle()} 
                                onInput={(e) => setDocTitle(e.target.value)} 
                                placeholder="Contoh: SOP Pelayanan IGD"
                            />
                        </div>
                        
                        {/* Nanti di sini bisa tambah dropdown Folder */}

                        <div class="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" onClick={() => setIsUploadOpen(false)} class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                            <button type="submit" disabled={uploadLoading()} class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                {uploadLoading() ? "Uploading" : "Upload"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}

export default Dashboard;