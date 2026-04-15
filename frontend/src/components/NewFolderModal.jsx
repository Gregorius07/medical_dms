import { createSignal, Show, For } from "solid-js";
import api from "../api";
import Swal from "sweetalert2";

function NewFolderModal(props) {
  const [newFolderName, setNewFolderName] = createSignal("");
  const [customFields, setCustomFields] = createSignal([]);
  const [newFieldName, setNewFieldName] = createSignal("");
  const [newFieldType, setNewFieldType] = createSignal("text");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newFolderName().trim()) return;

    setLoading(true);
    let schemaPayload = null;
    if (customFields().length > 0) {
      schemaPayload = {};
      customFields().forEach(field => {
        const key = field.name.trim().toLowerCase().replace(/\s+/g, '_');
        schemaPayload[key] = field.type;
      });
    }

    try {
      await api.post("/folders/create", {
        folder_name: newFolderName(),
        parent_folder: props.parentId,
        metadata_schema: schemaPayload
      });

      Swal.fire({ icon: "success", title: "Berhasil!", text: "Folder dibuat.", timer: 1500, showConfirmButton: false });
      
      // Reset & Close
      setNewFolderName("");
      setCustomFields([]);
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
        <div class="modal-card w-[450px]">
          <div class="modal-header">
            <h3 class="text-base font-bold text-gray-800">Create New Folder</h3>
          </div>

          <form onSubmit={handleSubmit} class="modal-body space-y-5">
            <div>
              <label class="input-label">Nama Folder</label>
              <input type="text" required class="input-field"
                value={newFolderName()} onInput={(e) => setNewFolderName(e.target.value)} />
            </div>

            <div class="border-t pt-4">
              <label class="input-label">Custom Metadata Schema</label>
              <div class="flex gap-2 mb-3">
                <input type="text" class="flex-[2] input-field" 
                  placeholder="Nama Field" value={newFieldName()} onInput={(e) => setNewFieldName(e.target.value)} />
                <select class="flex-[1] select-field" value={newFieldType()} onChange={(e) => setNewFieldType(e.target.value)}>
                  <option value="text">Teks</option>
                  <option value="number">Angka</option>
                  <option value="date">Tanggal</option>
                </select>
                <button type="button" onClick={() => {
                  if (newFieldName().trim()) {
                    setCustomFields([...customFields(), { name: newFieldName().trim(), type: newFieldType() }]);
                    setNewFieldName("");
                  }
                }} class="px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors">+</button>
              </div>

              <div class="flex flex-wrap gap-2">
                <For each={customFields()}>
                  {(field) => (
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {field.name} ({field.type})
                      <button type="button" onClick={() => setCustomFields(customFields().filter(f => f.name !== field.name))} class="text-red-500">×</button>
                    </span>
                  )}
                </For>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" onClick={props.onClose} class="btn-ghost">Cancel</button>
              <button type="submit" disabled={loading()} class="btn-primary">
                {loading() ? "Creating..." : "Create Folder"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}

export default NewFolderModal;