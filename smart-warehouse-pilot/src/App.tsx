import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import WarehouseSelection from "./pages/WarehouseSelection";
import Robots from "./pages/Robots";
import Users from "./pages/Users";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import WarehouseReports from "./pages/WarehouseReports";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/warehouses"
        element={
          <ProtectedRoute>
            <WarehouseSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/robots"
        element={
          <ProtectedRoute>
            <Robots />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/:warehouseCode"
        element={
          <ProtectedRoute>
            <WarehouseReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/:warehouseCode"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history/:warehouseCode"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
