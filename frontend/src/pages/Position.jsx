import { createSignal, onMount, createEffect } from "solid-js";
import api from "../api";
import Swal from "sweetalert2";

function Position() {
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
      const res = await api.get(`/positions?page=${page()}&size=5&search=${search()}`);
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
            await api.put(`/positions/${editId()}`, { name: formName() });
        } else {
            await api.post("/positions", { name: formName() });
        }

        // Tambahan notifikasi sukses
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data posisi berhasil disimpan.",
          timer: 1500,
          showConfirmButton: false
        });

        setIsModalOpen(false);
        setFormName("");
        setEditId(null);
        fetchData(); // Refresh table
    } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menyimpan data.",
        });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Data posisi ini tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if(!result.isConfirmed) return;

    try {
        await api.delete(`/positions/${id}`);
        Swal.fire({
          icon: "success",
          title: "Terhapus!",
          text: "Data posisi berhasil dihapus.",
          timer: 1500,
          showConfirmButton: false
        });
        
        fetchData();
    } catch (err) {
        // Mengganti alert error
        Swal.fire({
          icon: "error",
          title: "Gagal Menghapus",
          text: "Gagal menghapus. Data mungkin sedang digunakan.",
        });
    }
  };

  const openEdit = (item) => {
      setEditId(item.id_position);
      setFormName(item.position_name);
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
      <div class="action-bar">
        <div class="flex gap-3 w-full md:w-auto">
            <input 
                type="text" 
                placeholder="Search position..." 
                class="input-field md:w-64"
                value={search()}
                onInput={(e) => { setSearch(e.target.value); setPage(1); }}
            />
        </div>
        <button 
            onClick={openAdd}
            class="btn-primary flex items-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Position
        </button>
      </div>

      {/* TABLE */}
      <div class="table-container">
        <table class="w-full text-left border-collapse">
            <thead class="table-head">
                <tr>
                    <th>ID</th>
                    <th>Position Name</th>
                    <th class="text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="table-body">
                {data().length === 0 ? (
                    <tr><td colspan="3" class="px-6 py-10 text-center text-gray-400">Data not found</td></tr>
                ) : (
                    data().map((item) => (
                        <tr class="table-row-hover">
                            <td class="text-gray-400 font-mono text-xs">{item.id_position}</td>
                            <td class="font-medium text-gray-800">{item.position_name}</td>
                            <td class="text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <button onClick={() => openEdit(item)} class="btn-icon" title="Edit">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(item.id_position)} class="btn-icon-danger" title="Delete">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>

        {/* PAGINATION */}
        <div class="pagination-container">
            <p class="text-xs text-gray-400">
                Page {page()} of {totalPages()} · {totalItems()} results
            </p>
            <div class="flex gap-2">
                <button 
                    disabled={page() === 1}
                    onClick={() => setPage(p => p - 1)}
                    class="pagination-btn"
                >
                    Previous
                </button>
                <button 
                    disabled={page() === totalPages()}
                    onClick={() => setPage(p => p + 1)}
                    class="pagination-btn"
                >
                    Next
                </button>
            </div>
        </div>
      </div>

      {/* MODAL FORM */}
      {isModalOpen() && (
        <div class="modal-overlay">
            <div class="modal-card w-[420px]">
                <div class="modal-header">
                    <h3 class="text-base font-bold text-gray-800">{editId() ? "Edit Position" : "Add New Position"}</h3>
                </div>
                <form onSubmit={handleSubmit} class="modal-body">
                    <div>
                        <label class="input-label">Position Name</label>
                        <input 
                            type="text" 
                            class="input-field"
                            value={formName()}
                            onInput={(e) => setFormName(e.target.value)}
                            required
                            autofocus
                        />
                    </div>
                    <div class="modal-footer">
                        <button type="button" onClick={() => setIsModalOpen(false)} class="btn-ghost">Cancel</button>
                        <button type="submit" disabled={loading()} class="btn-primary">
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

export default Position;