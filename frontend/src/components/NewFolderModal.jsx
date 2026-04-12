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
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-2xl w-[450px] overflow-hidden">
          <div class="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-3">
            <h3 class="text-lg font-bold text-gray-800">Create New Folder</h3>
          </div>

          <form onSubmit={handleSubmit} class="p-6 space-y-5">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1 uppercase">Nama Folder</label>
              <input type="text" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={newFolderName()} onInput={(e) => setNewFolderName(e.target.value)} />
            </div>

            <div class="border-t pt-4">
              <label class="block text-xs font-bold text-gray-700 mb-2 uppercase">Custom Metadata Schema</label>
              <div class="flex gap-2 mb-3">
                <input type="text" class="flex-[2] border rounded-lg px-3 py-2 text-sm outline-none" 
                  placeholder="Nama Field" value={newFieldName()} onInput={(e) => setNewFieldName(e.target.value)} />
                <select class="flex-[1] border rounded-lg px-2 py-2 text-sm bg-white" value={newFieldType()} onChange={(e) => setNewFieldType(e.target.value)}>
                  <option value="text">Teks</option>
                  <option value="number">Angka</option>
                  <option value="date">Tanggal</option>
                </select>
                <button type="button" onClick={() => {
                  if (newFieldName().trim()) {
                    setCustomFields([...customFields(), { name: newFieldName().trim(), type: newFieldType() }]);
                    setNewFieldName("");
                  }
                }} class="px-3 bg-gray-100 rounded-lg text-sm">+</button>
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

            <div class="flex justify-end gap-2 pt-4 border-t">
              <button type="button" onClick={props.onClose} class="px-4 py-2 text-gray-500 text-sm">Cancel</button>
              <button type="submit" disabled={loading()} class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
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