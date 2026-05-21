import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import WarehouseSelection from "./pages/WarehouseSelection";
import Robots from "./pages/Robots";
import Users from "./pages/Users";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/warehouses" element={<WarehouseSelection />} />
      <Route path="/robots" element={<Robots />} />
      <Route path="/users" element={<Users />} />
      <Route path="/dashboard/:warehouseCode" element={<Dashboard />} />
      <Route path="/history/:warehouseCode" element={<History />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
