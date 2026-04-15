import { createSignal, createEffect, onMount } from "solid-js";
import api from "../api";
import Swal from "sweetalert2";
function User() {
  // State Data Utama
  const [data, setData] = createSignal([]);
  
  // State untuk Dropdown (Master Data)
  const [positions, setPositions] = createSignal([]);
  const [departments, setDepartments] = createSignal([]);

  // State Table & Pagination
  const [search, setSearch] = createSignal("");
  const [page, setPage] = createSignal(1);
  const [totalPages, setTotalPages] = createSignal(1);
  const [totalItems, setTotalItems] = createSignal(0);

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [editId, setEditId] = createSignal(null);
  const [loading, setLoading] = createSignal(false);

  // State Form Input
  const [formData, setFormData] = createSignal({
    fullName: "",
    username: "", 
    password: "",
    idPosition: "",
    idDepartment: "",
    isAdmin: false
  });

  // 1. Fetch Master Data (Untuk Dropdown) - Dijalankan sekali saat mount
  onMount(async () => {
    try {
      // Kita panggil API positions & departments (tanpa pagination/limit besar agar semua muncul)
      const [posRes, deptRes] = await Promise.all([
        api.get("/positions?size=100"), 
        api.get("/departments?size=100") // Pastikan endpoint department sudah dibuat sebelumnya
      ]);
      setPositions(posRes.data.data);
      setDepartments(deptRes.data.data);
    } catch (err) {
      console.error("Gagal load master data", err);
    }
  });

  // 2. Fetch User Data - Dijalankan tiap page/search berubah
  const fetchData = async () => {
    try {
      const res = await api.get(`/users?page=${page()}&size=5&search=${search()}`);
      setData(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.totalItems);
    } catch (err) { console.error(err); }
  };

  createEffect(() => fetchData());

  // Handle Form Input
  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const openAdd = () => {
    setEditId(null);
    setFormData({ fullName: "", username: "", password: "", idPosition: "", idDepartment: "", isAdmin: false });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditId(item.id_user);
    setFormData({
        fullName: item.full_name,
        username: item.username,
        password: "", // Kosongkan password saat edit (biar gak ketimpa kalau gak diisi)
        idPosition: item.id_position || "",
        idDepartment: item.id_department || "",
        isAdmin: item.is_admin
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (editId()) {
            await api.put(`/users/${editId()}`, formData());
        } else {
            await api.post("/users", formData());
        }
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data user berhasil disimpan.",
          timer: 1500,
          showConfirmButton: false
        });
        setIsModalOpen(false);
        fetchData();
    } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal Menyimpan",
          text: err.response?.data?.message || "Gagal menyimpan data user.",
        });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Mengganti confirm() bawaan dengan Swal
    const result = await Swal.fire({
      title: "Hapus User?",
      text: "Data user ini akan dihapus secara permanen!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if(!result.isConfirmed) return;

    try {
        await api.delete(`/users/${id}`);
        
        // Notifikasi sukses hapus
        Swal.fire({
          icon: "success",
          title: "Terhapus!",
          text: "User berhasil dihapus.",
          timer: 1500,
          showConfirmButton: false
        });

        fetchData();
    } catch (err) {
        // Mengganti alert error
        Swal.fire({
          icon: "error",
          title: "Gagal Menghapus",
          text: err.response?.data?.message || "Gagal menghapus user.",
        });
    }
  };

  return (
    <div>
      {/* FILTER & ACTION */}
      <div class="action-bar">
        <input 
            type="text" 
            placeholder="Search user..." 
            class="input-field md:w-64"
            value={search()}
            onInput={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button onClick={openAdd} class="btn-primary flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add User
        </button>
      </div>

      {/* TABLE */}
      <div class="table-container overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead class="table-head">
                <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th class="text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="table-body">
                {data().map((item) => (
                    <tr class="table-row-hover">
                        <td class="font-medium text-gray-800">{item.full_name}</td>
                        <td class="text-gray-500">{item.username}</td>
                        {/* Menampilkan Nama Posisi & Dept dari hasil JOIN */}
                        <td>{item.position_name || '-'}</td>
                        <td>{item.department_name || '-'}</td>
                        <td>
                            <span class={item.is_admin ? 'badge-info' : 'badge-neutral'}>
                                {item.is_admin ? 'Admin' : 'Staff'}
                            </span>
                        </td>
                        <td class="text-right">
                            <div class="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(item)} class="btn-icon" title="Edit">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(item.id_user)} class="btn-icon-danger" title="Delete">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {isModalOpen() && (
        <div class="modal-overlay">
            <div class="modal-card w-[520px]">
                <div class="modal-header">
                    <h3 class="text-base font-bold text-gray-800">{editId() ? "Edit User" : "Add New User"}</h3>
                </div>
                <form onSubmit={handleSubmit} class="modal-body space-y-4">
                    
                    <div>
                        <label class="input-label">Full Name</label>
                        <input type="text" required class="input-field"
                            value={formData().fullName} onInput={(e) => updateForm('fullName', e.target.value)} />
                    </div>

                    <div>
                        <label class="input-label">Username</label>
                        <input type="text" required class="input-field"
                            value={formData().username} onInput={(e) => updateForm('username', e.target.value)} />
                    </div>

                    <div>
                        <label class="input-label">
                            Password {editId() && <span class="text-gray-400 font-normal normal-case tracking-normal">(Leave blank to keep current)</span>}
                        </label>
                        <input type="password" class="input-field"
                            required={!editId()} // Wajib hanya saat Add
                            value={formData().password} onInput={(e) => updateForm('password', e.target.value)} />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="input-label">Position</label>
                            <select class="select-field"
                                value={formData().idPosition} onChange={(e) => updateForm('idPosition', e.target.value)} required>
                                <option value="">Select Position</option>
                                {positions().map(p => (
                                    <option value={p.id_position}>{p.position_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label class="input-label">Department</label>
                            <select class="select-field"
                                value={formData().idDepartment} onChange={(e) => updateForm('idDepartment', e.target.value)} required>
                                <option value="">Select Department</option>
                                {departments().map(d => (
                                    <option value={d.id_department}>{d.department_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div class="flex items-center gap-2.5 pt-1">
                        <input type="checkbox" id="isAdmin" class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={formData().isAdmin} 
                            onChange={(e) => updateForm('isAdmin', e.target.checked)} 
                        />
                        <label for="isAdmin" class="text-sm text-gray-700">Grant Administrator Access</label>
                    </div>

                    <div class="modal-footer">
                        <button type="button" onClick={() => setIsModalOpen(false)} class="btn-ghost">Cancel</button>
                        <button type="submit" disabled={loading()} class="btn-primary">
                            {loading() ? "Saving..." : "Save User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

export default User;