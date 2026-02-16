import { createSignal, onMount, createEffect } from "solid-js";
import api from "../api";

function Department() {
  const [data, setData] = createSignal([]);
  const [search, setSearch] = createSignal("");
  const [page, setPage] = createSignal(1);
  const [totalPages, setTotalPages] = createSignal(1);
  const [totalItems, setTotalItems] = createSignal(0);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [editId, setEditId] = createSignal(null); // Jika null berarti mode Add
  const [formName, setFormName] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  // Fetch Data
  const fetchData = async () => {
    try {
      const res = await api.get(`/departments?page=${page()}&size=5&search=${search()}`);
      setData(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
    } catch (err) {
      console.error(err);
    }
  };

  // Efek ketika page atau search berubah
  createEffect(() => {
    fetchData();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (editId()) {
            await api.put(`/departments/${editId()}`, { name: formName() });
        } else {
            await api.post("/departments", { name: formName() });
        }
        setIsModalOpen(false);
        setFormName("");
        setEditId(null);
        fetchData(); // Refresh table
    } catch (err) {
        alert("Gagal menyimpan data");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Yakin ingin menghapus?")) return;
    try {
        await api.delete(`/departments/${id}`);
        fetchData();
    } catch (err) {
        alert("Gagal menghapus. Data mungkin sedang digunakan.");
    }
  };

  const openEdit = (item) => {
      setEditId(item.id_department);
      setFormName(item.department_name);
      setIsModalOpen(true);
  };

  const openAdd = () => {
      setEditId(null);
      setFormName("");
      setIsModalOpen(true);
  }

  return (
    <div>
      {/* FILTER & ACTION BAR */}
      <div class="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex gap-4 w-full md:w-auto">
            <input 
                type="text" 
                placeholder="Search department..." 
                class="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full md:w-64"
                value={search()}
                onInput={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {/* Visual Filter (Mock) */}
            {/* <select class="border border-gray-200 rounded-lg px-4 py-2 text-sm bg-white text-gray-500">
                <option>Status: All</option>
                <option>Active</option>
            </select> */}
        </div>
        <button 
            onClick={openAdd}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
            + Add New Department
        </button>
      </div>

      {/* TABLE */}
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                <tr>
                    <th class="px-6 py-4">ID</th>
                    <th class="px-6 py-4">Department Name</th>
                    <th class="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="text-sm text-gray-700">
                {data().length === 0 ? (
                    <tr><td colspan="3" class="px-6 py-8 text-center text-gray-400">Data not found</td></tr>
                ) : (
                    data().map((item) => (
                        <tr class="border-b last:border-0 hover:bg-gray-50">
                            <td class="px-6 py-4">#{item.id_department}</td>
                            <td class="px-6 py-4 font-medium">{item.department_name}</td>
                            <td class="px-6 py-4 text-right">
                                <button onClick={() => openEdit(item)} class="text-blue-500 hover:text-blue-700 mr-3">Edit</button>
                                <button onClick={() => handleDelete(item.id_department)} class="text-red-500 hover:text-red-700">Delete</button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>

        {/* PAGINATION */}
        <div class="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
            <p class="text-xs text-gray-500">
                Showing page {page()} of {totalPages()} ({totalItems()} results)
            </p>
            <div class="flex gap-2">
                <button 
                    disabled={page() === 1}
                    onClick={() => setPage(p => p - 1)}
                    class="px-3 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
                >
                    Previous
                </button>
                <button 
                    disabled={page() === totalPages()}
                    onClick={() => setPage(p => p + 1)}
                    class="px-3 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
      </div>

      {/* MODAL FORM */}
      {isModalOpen() && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg w-96 p-6">
                <h3 class="text-lg font-bold mb-4">{editId() ? "Edit Department" : "Add New Department"}</h3>
                <form onSubmit={handleSubmit}>
                    <label class="block text-sm text-gray-600 mb-2">Department Name</label>
                    <input 
                        type="text" 
                        class="w-full border rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-blue-500"
                        value={formName()}
                        onInput={(e) => setFormName(e.target.value)}
                        required
                        autofocus
                    />
                    <div class="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                        <button type="submit" disabled={loading()} class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                            {loading() ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

export default Department;