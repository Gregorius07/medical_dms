import { useNavigate } from "@solidjs/router";
import { onMount } from "solid-js";

function AdminRoute(props) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  onMount(() => {
    // Cek Role
    if (user.role !== "Administrator") {
      alert("Anda tidak memiliki akses ke halaman ini!");
      navigate("/dashboard"); // Redirect paksa
    }
  });

  // Jika Admin, tampilkan halaman aslinya
  return user.role === "Administrator" ? props.children : null;
}

export default AdminRoute;