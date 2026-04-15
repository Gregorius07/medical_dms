import { Router, Route } from "@solidjs/router";
import Login from "./pages/Login";
import Position from "./pages/Position";
import Department from "./pages/Department";
import MainLayout from "./components/MainLayout";
import User from "./pages/User";
import Approval from "./pages/Approval";
import { checkSession, isAuthLoading } from "./store/authStore";
import { onMount, Show } from "solid-js";
import Draft from "./pages/Draft";
import Folder from "./pages/Folder";
import DocumentDetail from "./components/DocumentDetail";
function App() {
  onMount(() => {
    checkSession();
  });
  return (
    <Show when={!isAuthLoading()} fallback={
      <div class="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <div class="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div class="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p class="mt-3 text-xs text-gray-400 font-medium">Loading...</p>
      </div>
    }>
      <Router>
        <Route path="/" component={Login} />

        {/* Halaman yang menggunakan Layout Sidebar */}
        <Route component={MainLayout}>
          <Route path="/positions" component={Position} />
          <Route path="/departments" component={Department} />
          <Route path="/users" component={User} />
          <Route path="/approvals" component={Approval} />
          <Route path="/draft" component={Draft} />
          <Route path="/folders" component={Folder} />
          <Route path="/document/:id" component={DocumentDetail} />
        </Route>
      </Router>
    </Show>
  );
}

export default App;
