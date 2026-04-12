import { createSignal, Show, For } from "solid-js";
import api from "../api";
import { currentUser } from "../store/authStore";
import Swal from "sweetalert2";

function UploadDocumentModal(props) {
  const [docTitle, setDocTitle] = createSignal("");
  const [uploadFile, setUploadFile] = createSignal(null);
  const [customMetadata, setCustomMetadata] = createSignal({});
  const [loading, setLoading] = createSignal(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", uploadFile());
    formData.append("title", docTitle());
    formData.append("uploaderId", currentUser().id);
    formData.append("uploaderName", currentUser().name);
    if (props.folderId) formData.append("folderId", props.folderId);

    if (Object.keys(customMetadata()).length > 0) {
      formData.append("customMetadata", JSON.stringify(customMetadata()));
    }

    try {
      await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      Swal.fire({ icon: "success", title: "Berhasil!", text: "Dokumen diunggah." });
      
      setDocTitle("");
      setUploadFile(null);
      setCustomMetadata({});
      props.onSuccess();
      props.onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-lg w-[500px] p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-bold mb-4">Upload Document</h3>
          <form onSubmit={handleUpload} class="space-y-4">
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center relative bg-gray-50">
              <input type="file" required class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  setUploadFile(file);
                  if(!docTitle()) setDocTitle(file.name);
                }} />
              <div class="text-blue-600 font-medium">{uploadFile() ? uploadFile().name : "Click to select file"}</div>
            </div>

            <div>
              <label class="text-xs font-bold text-black uppercase">Document Title</label>
              <input type="text" required class="w-full border rounded-lg px-3 py-2 text-sm" 
                value={docTitle()} onInput={(e) => setDocTitle(e.target.value)} />
            </div>

            {/* FORM DINAMIS BERDASARKAN SCHEMA */}
            <Show when={props.schema && Object.keys(props.schema).length > 0}>
              <div class="border-t pt-4 space-y-3">
                <p class="text-xs font-bold text-black uppercase">Metadata</p>
                <For each={Object.entries(props.schema)}>
                  {([field, type]) => (
                    <div>
                      <label class="block text-[11px] font-bold text-gray-600 uppercase">{field.replace(/_/g, ' ')}</label>
                      <input type={type} required class="w-full border rounded-lg px-3 py-2 text-sm bg-indigo-50/30"
                        value={customMetadata()[field] || ""}
                        onInput={(e) => setCustomMetadata({ ...customMetadata(), [field]: e.target.value })} />
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <div class="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={props.onClose} class="px-4 py-2 text-gray-500 text-sm">Cancel</button>
              <button type="submit" disabled={loading()} class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                {loading() ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}

export default UploadDocumentModal;