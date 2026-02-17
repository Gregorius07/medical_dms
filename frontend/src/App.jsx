import { Router, Route } from "@solidjs/router";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Position from "./pages/Position";
import Department from "./pages/Department";
import MainLayout from "./components/MainLayout";
import User from "./pages/User";

function App() {
  return (
      <Router>
        <Route path="/" component={Login} />
        
        {/* Halaman yang menggunakan Layout Sidebar */}
        <Route component={MainLayout}>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/positions" component={Position} />
          <Route path="/departments" component={Department} />
          <Route path="/users" component={User} />
        </Route>

      </Router>
  );
}

export default App;