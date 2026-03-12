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
      <div class="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row justify-between gap-4">
        <input 
            type="text" 
            placeholder="Search user..." 
            class="border rounded-lg px-4 py-2 text-sm w-full md:w-64"
            value={search()}
            onInput={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button onClick={openAdd} class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add New User
        </button>
      </div>

      {/* TABLE */}
      <div class="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                <tr>
                    <th class="px-6 py-4">Name</th>
                    <th class="px-6 py-4">Email/Username</th>
                    <th class="px-6 py-4">Position</th>
                    <th class="px-6 py-4">Department</th>
                    <th class="px-6 py-4">Role</th>
                    <th class="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="text-sm text-gray-700">
                {data().map((item) => (
                    <tr class="border-b last:border-0 hover:bg-gray-50">
                        <td class="px-6 py-4 font-medium">{item.full_name}</td>
                        <td class="px-6 py-4">{item.username}</td>
                        {/* Menampilkan Nama Posisi & Dept dari hasil JOIN */}
                        <td class="px-6 py-4">{item.position_name || '-'}</td>
                        <td class="px-6 py-4">{item.department_name || '-'}</td>
                        <td class="px-6 py-4">
                            <span class={`px-2 py-1 rounded text-xs ${item.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                {item.is_admin ? 'Admin' : 'Staff'}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button onClick={() => openEdit(item)} class="text-blue-500 hover:text-blue-700 mr-3">Edit</button>
                            <button onClick={() => handleDelete(item.id_user)} class="text-red-500 hover:text-red-700">Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {isModalOpen() && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg w-[500px] p-6 max-h-[90vh] overflow-y-auto">
                <h3 class="text-lg font-bold mb-4">{editId() ? "Edit User" : "Add New User"}</h3>
                <form onSubmit={handleSubmit} class="space-y-4">
                    
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" required class="w-full border rounded-lg px-3 py-2 text-sm"
                            value={formData().fullName} onInput={(e) => updateForm('fullName', e.target.value)} />
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Username</label>
                        <input type="text" required class="w-full border rounded-lg px-3 py-2 text-sm"
                            value={formData().username} onInput={(e) => updateForm('username', e.target.value)} />
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">
                            Password {editId() && <span class="text-gray-400 font-normal">(Leave blank to keep current)</span>}
                        </label>
                        <input type="password" class="w-full border rounded-lg px-3 py-2 text-sm"
                            required={!editId()} // Wajib hanya saat Add
                            value={formData().password} onInput={(e) => updateForm('password', e.target.value)} />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Position</label>
                            <select class="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                value={formData().idPosition} onChange={(e) => updateForm('idPosition', e.target.value)} required>
                                <option value="">Select Position</option>
                                {positions().map(p => (
                                    <option value={p.id_position}>{p.position_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Department</label>
                            <select class="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                                value={formData().idDepartment} onChange={(e) => updateForm('idDepartment', e.target.value)} required>
                                <option value="">Select Department</option>
                                {departments().map(d => (
                                    <option value={d.id_department}>{d.department_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-2">
                        <input type="checkbox" id="isAdmin" 
                            checked={formData().isAdmin} 
                            onChange={(e) => updateForm('isAdmin', e.target.checked)} 
                        />
                        <label for="isAdmin" class="text-sm text-gray-700">Grant Administrator Access</label>
                    </div>

                    <div class="flex justify-end gap-2 pt-4 border-t mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} class="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                        <button type="submit" disabled={loading()} class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
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