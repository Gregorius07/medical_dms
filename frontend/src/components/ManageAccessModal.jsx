import { createSignal, onMount, For, Show } from "solid-js";
import api from "../api";

function ManageAccessModal(props) {
  // props: resourceId, resourceType ('FOLDER' atau 'DOCUMENT'), onClose (fungsi untuk menutup modal)
  
  const [accessList, setAccessList] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  
  // State untuk Form Tambah Akses
  const [fullName, setfullName] = createSignal("");
  const [permissions, setPermissions] = createSignal({
    preview: true, // Wajib nyala by default agar bisa melihat
    download: false,
    upload: false,
    edit_metadata: false
  });
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Mengambil daftar user yang saat ini punya akses
  const fetchAccessList = async () => {
    try {
      setLoading(true);
      const endpoint = props.resourceType === 'FOLDER' 
        ? `/permissions/folder/${props.resourceId}` 
        : `/permissions/document/${props.resourceId}`;
        
      const res = await api.get(endpoint);
      setAccessList(res.data);
    } catch (err) {
      console.error("Gagal mengambil daftar akses", err);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchAccessList();
  });

  const handleTogglePermission = (field) => {
    setPermissions(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!fullName()) return alert("Masukkan nama pengguna!");

    setIsSubmitting(true);
    try {
      await api.post('/permissions/grant', {
        resourceId: props.resourceId,
        resourceType: props.resourceType,
        full_name: fullName(), // Di backend, cari user berdasarkan fullname ini
        permissions: permissions()
      });
      
      alert("Akses berhasil diberikan!");
      setfullName("");
      // Reset form ke default
      setPermissions({ preview: true, download: false, upload: false, edit_metadata: false });
      
      // Refresh daftar
      fetchAccessList();
    } catch (err) {
      alert("Gagal memberikan akses: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAccess = async (idPermission) => {
    if (!confirm("Cabut akses pengguna ini?")) return;
    
    try {
      await api.delete(`/permissions/revoke/${idPermission}`);
      fetchAccessList(); // Refresh daftar
    } catch (err) {
      alert("Gagal mencabut akses");
    }
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER MODAL */}
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 class="text-lg font-bold text-gray-800">Manage Access</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {props.resourceType === 'FOLDER' ? 'Mengelola akses Folder ID:' : 'Mengelola akses Dokumen ID:'} {props.resourceId}
            </p>
          </div>
          <button onClick={props.onClose} class="text-gray-400 hover:text-gray-600 transition bg-white p-2 rounded-full shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* BAGIAN 1: FORM TAMBAH AKSES BARU */}
          <div>
            <h4 class="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Add User Access</h4>
            <form onSubmit={handleGrantAccess} class="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-4">
              
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap Pengguna</label>
                <input 
                  type="text" 
                  required
                  value={fullName()}
                  onInput={(e) => setfullName(e.target.value)}
                  placeholder="Contoh: Gregorius Denmas" 
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-2">Pilih Hak Akses (Granular)</label>
                <div class="grid grid-cols-2 gap-3">
                  {/* Checkbox Preview */}
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={permissions().preview} onChange={() => handleTogglePermission('preview')} class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span class="text-sm text-gray-700">Preview (Lihat)</span>
                  </label>
                  {/* Checkbox Download */}
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={permissions().download} onChange={() => handleTogglePermission('download')} class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span class="text-sm text-gray-700">Download</span>
                  </label>
                  {/* Checkbox Upload */}
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={permissions().upload} onChange={() => handleTogglePermission('upload')} class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span class="text-sm text-gray-700">Upload Revisi</span>
                  </label>
                  {/* Checkbox Edit */}
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={permissions().edit_metadata} onChange={() => handleTogglePermission('edit_metadata')} class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span class="text-sm text-gray-700">Edit Metadata</span>
                  </label>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button type="submit" disabled={isSubmitting()} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                  {isSubmitting() ? "Memproses..." : "Beri Akses"}
                </button>
              </div>
            </form>
          </div>

          {/* BAGIAN 2: DAFTAR AKSES SAAT INI */}
          <div>
            <h4 class="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider flex justify-between items-center">
              <span>Current Access</span>
              <span class="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">{accessList().length} User</span>
            </h4>
            
            <div class="border border-gray-200 rounded-xl overflow-hidden">
              <Show when={!loading()} fallback={<div class="p-4 text-center text-sm text-gray-500">Memuat data...</div>}>
                <Show when={accessList().length > 0} fallback={<div class="p-8 text-center text-sm text-gray-500 italic">Belum ada user yang diberi akses khusus.</div>}>
                  <div class="divide-y divide-gray-100 max-h-[250px] overflow-y-auto">
                    <For each={accessList()}>
                      {(item) => (
                        <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                          
                          {/* Info User */}
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                              {item.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p class="text-sm font-bold text-gray-800">{item.user_name}</p>
                              <p class="text-xs text-gray-500">{item.email || "User ID: " + item.id_user}</p>
                            </div>
                          </div>

                          {/* Hak Akses & Tombol Hapus */}
                          <div class="flex items-center gap-4">
                            {/* Badges Hak Akses */}
                            <div class="flex gap-1">
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.preview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-300'}`} title="Preview">👁️</span>
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.download ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-300'}`} title="Download">⬇️</span>
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.upload ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-300'}`} title="Upload">⬆️</span>
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.edit_metadata ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-300'}`} title="Edit">✏️</span>
                            </div>
                            
                            {/* Tombol Hapus (Revoke) */}
                            <button onClick={() => handleRevokeAccess(item.id_permission)} class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Cabut Akses">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>

                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ManageAccessModal;