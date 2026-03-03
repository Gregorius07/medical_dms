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
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.preview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-300'}`} title="Preview"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 21V3h18v18zm2-2h14V7H5zm3.338-3.113Q6.725 14.776 6 13q.725-1.775 2.338-2.887T12 9t3.663 1.113T18 13q-.725 1.775-2.337 2.888T12 17t-3.662-1.112m2.6-1.826Q10.5 13.626 10.5 13t.438-1.062T12 11.5t1.063.438T13.5 13t-.437 1.063T12 14.5t-1.062-.437m2.837.712Q14.5 14.05 14.5 13t-.725-1.775T12 10.5t-1.775.725T9.5 13t.725 1.775T12 15.5t1.775-.725"/></svg></span>
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.download ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-300'}`} title="Download"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11.625 15.513q-.175-.063-.325-.213l-3.6-3.6q-.3-.3-.288-.7t.288-.7q.3-.3.713-.312t.712.287L11 12.15V5q0-.425.288-.712T12 4t.713.288T13 5v7.15l1.875-1.875q.3-.3.713-.288t.712.313q.275.3.288.7t-.288.7l-3.6 3.6q-.15.15-.325.213t-.375.062t-.375-.062M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20z"/></svg></span>
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.upload ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-300'}`} title="Upload"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 20q-.825 0-1.412-.587T4 18v-2q0-.425.288-.712T5 15t.713.288T6 16v2h12v-2q0-.425.288-.712T19 15t.713.288T20 16v2q0 .825-.587 1.413T18 20zm5-12.15L9.125 9.725q-.3.3-.712.288T7.7 9.7q-.275-.3-.288-.7t.288-.7l3.6-3.6q.15-.15.325-.212T12 4.425t.375.063t.325.212l3.6 3.6q.3.3.288.7t-.288.7q-.3.3-.712.313t-.713-.288L13 7.85V15q0 .425-.288.713T12 16t-.712-.288T11 15z"/></svg></span>
                              <span class={`w-6 h-6 flex items-center justify-center rounded text-xs ${item.edit_metadata ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-300'}`} title="Edit"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6.525q.5 0 .75.313t.25.687t-.262.688T11.5 5H5v14h14v-6.525q0-.5.313-.75t.687-.25t.688.25t.312.75V19q0 .825-.587 1.413T19 21zm4-7v-2.425q0-.4.15-.763t.425-.637l8.6-8.6q.3-.3.675-.45t.75-.15q.4 0 .763.15t.662.45L22.425 3q.275.3.425.663T23 4.4t-.137.738t-.438.662l-8.6 8.6q-.275.275-.637.438t-.763.162H10q-.425 0-.712-.288T9 14m12.025-9.6l-1.4-1.4zM11 13h1.4l5.8-5.8l-.7-.7l-.725-.7L11 11.575zm6.5-6.5l-.725-.7zl.7.7z"/></svg></span>
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