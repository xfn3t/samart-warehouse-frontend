import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import WarehouseMap from "@/components/dashboard/WarehouseMap";
import RealTimeStats from "@/components/dashboard/RealTimeStats";
import RecentScans from "@/components/dashboard/RecentScans";
import AIPredictions from "@/components/dashboard/AIPredictions";

const Dashboard = () => {
  const navigate = useNavigate();
  const { warehouseCode } = useParams();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  if (!warehouseCode) {
    return <div>Склад не выбран</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header warehouseCode={warehouseCode} />
      <Navigation warehouseCode={warehouseCode} />

      <main className="p-6">
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          <div className="row-span-3">
            <WarehouseMap warehouseCode={warehouseCode} />
          </div>

          <div className="space-y-6">
            <div className="h-[calc(33%-8px)]">
              <RealTimeStats warehouseCode={warehouseCode} />
            </div>
          </div>

          <div className="h-[calc(33%-8px)]">
            <RecentScans warehouseCode={warehouseCode} />
          </div>

          <div className="h-[calc(34%-8px)]">
            <AIPredictions warehouseCode={warehouseCode} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
