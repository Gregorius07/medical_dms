import { createSignal, onMount } from "solid-js";
import { A, useNavigate, useLocation } from "@solidjs/router";
import { currentUser, setCurrentUser } from "../store/authStore";
import api from "../api";
function MainLayout(props) {
  const navigate = useNavigate();
  const location = useLocation();

  onMount(() => {
    if (!currentUser()) {
      navigate("/");
    }
  });

  const handleLogout = async () => {
    setCurrentUser(null);
    const response = await api.get("/logout");
    console.log(response.data);
    navigate("/");
  };

  // Helper untuk class aktif
  const activeClass = (path) =>
    location.pathname === path
      ? "bg-blue-50 text-blue-600 font-medium"
      : "text-gray-500 hover:bg-gray-50";

  return (
    <div class="flex h-screen bg-[#F4F7FE]">
      {/* SIDEBAR */}
      <div class="w-64 bg-white shadow-sm flex flex-col z-10">
        <div class="p-6">
          <h2 class="text-xl font-bold text-blue-600 flex items-center gap-2">
            MedDocs
          </h2>
        </div>

        <nav class="flex-1 px-4 space-y-2 text-sm">
          <Show when={currentUser()?.role != "admin"}>
            <A
              href="/draft"
              class={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeClass("/draft")}`}
            >
              Draft
            </A>
          </Show>
          <A
            href="/folders"
            class={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeClass("/folders")}`}
          >
            Folder
          </A>
          <A
            href="/approvals"
            class={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeClass("/approvals")}`}
          >
            Approval
          </A>
          <Show when={currentUser()?.role === "admin"}>
            <div class="pt-4 text-xs font-semibold text-gray-400 uppercase px-4">
              Configuration
            </div>
            <A
              href="/positions"
              class={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeClass("/positions")}`}
            >
              Position
            </A>
            <A
              href="/departments"
              class={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeClass("/departments")}`}
            >
              Department
            </A>
            <A
              href="/users"
              class={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeClass("/users")}`}
            >
              Users
            </A>
          </Show>
        </nav>
      </div>

      {/* MAIN CONTENT WRAPPER */}
      <div class="flex-1 flex flex-col overflow-hidden relative">
        {/* HEADER */}
        <header class="bg-white p-6 flex justify-between items-center shadow-sm">
          <h1 class="text-2xl font-bold text-gray-800 capitalize">
            {location.pathname.replace("/", "") || "Folder"}
          </h1>
          <div class="text-right flex items-center gap-4">
            <div class="text-right">
              <p class="font-bold text-gray-800 text-sm">
                {currentUser()?.name}
              </p>
              <p class="text-xs text-gray-500">{currentUser()?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              class="px-4 py-2 bg-red-50 text-red-500 text-xs rounded hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </header>

        {/* DYNAMIC CONTENT */}
        <main class="flex-1 overflow-y-auto p-6">{props.children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
