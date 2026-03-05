import { Router, Route } from "@solidjs/router";
import Login from "./pages/Login";
import Position from "./pages/Position";
import Department from "./pages/Department";
import MainLayout from "./components/MainLayout";
import User from "./pages/User";
import {checkSession, isAuthLoading} from './store/authStore';
import { onMount, Show } from "solid-js";
import Draft from "./pages/Draft";
import Folder from "./pages/Folder";
import DocumentDetail from "./components/DocumentDetail";

function App() {
  onMount(()=>{
    checkSession();
  })
  return (
    <Show when={!isAuthLoading()} fallback={<div>Loading aplikasi...</div>}>
      <Router>
        <Route path="/" component={Login} />
        
        {/* Halaman yang menggunakan Layout Sidebar */}
        <Route component={MainLayout}>
          <Route path="/positions" component={Position} />
          <Route path="/departments" component={Department} />
          <Route path="/users" component={User} />
          <Route path="/draft" component={Draft} />
          <Route path="/folders" component={Folder} />
          <Route path="/document/:id" component={DocumentDetail} />
        </Route>

      </Router>
    </Show>
  );
}

export default App;