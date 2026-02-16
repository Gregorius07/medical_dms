import { Router, Route } from "@solidjs/router";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Position from "./pages/Position";
import Department from "./pages/Department";
import MainLayout from "./components/MainLayout";
import User from "./pages/User";
import AdminRoute from "./components/AdminRoute";

function App() {
  return (
    <Router>
      <Route path="/" component={Login} />
      
      {/* Halaman yang menggunakan Layout Sidebar */}
      <Route path="/dashboard" component={() => (
        <MainLayout><Dashboard /></MainLayout>
      )} />
      
      <Route path="/positions" component={() => (
        <AdminRoute>
        <MainLayout><Position /></MainLayout></AdminRoute>
      )} />
      
      <Route path="/departments" component={() => (
        <AdminRoute>
        <MainLayout><Department /></MainLayout></AdminRoute>
      )} />
      <Route path="/users" component={() => (
        <AdminRoute>
        <MainLayout><User /></MainLayout></AdminRoute>
      )} />

    </Router>
  );
}

export default App;