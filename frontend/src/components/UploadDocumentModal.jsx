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
      <div class="modal-overlay">
        <div class="modal-card w-[500px] max-h-[90vh] overflow-y-auto">
          <div class="modal-header">
            <h3 class="text-base font-bold text-gray-800">Upload Document</h3>
          </div>
          <form onSubmit={handleUpload} class="modal-body space-y-4">
            <div class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center relative bg-gray-50/80 hover:bg-gray-50 transition-colors">
              <input type="file" required class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  setUploadFile(file);
                  if(!docTitle()) setDocTitle(file.name);
                }} />
              <div class="text-primary-600 font-medium text-sm">{uploadFile() ? uploadFile().name : "Click to select file"}</div>
            </div>

            <div>
              <label class="input-label">Document Title</label>
              <input type="text" required class="input-field" 
                value={docTitle()} onInput={(e) => setDocTitle(e.target.value)} />
            </div>

            {/* FORM DINAMIS BERDASARKAN SCHEMA */}
            <Show when={props.schema && Object.keys(props.schema).length > 0}>
              <div class="border-t pt-4 space-y-3">
                <p class="input-label">Metadata</p>
                <For each={Object.entries(props.schema)}>
                  {([field, type]) => (
                    <div>
                      <label class="input-label">{field.replace(/_/g, ' ')}</label>
                      <input type={type} required class="input-field"
                        value={customMetadata()[field] || ""}
                        onInput={(e) => setCustomMetadata({ ...customMetadata(), [field]: e.target.value })} />
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <div class="modal-footer">
              <button type="button" onClick={props.onClose} class="btn-ghost">Cancel</button>
              <button type="submit" disabled={loading()} class="btn-primary">
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