import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import WarehouseMap from "@/components/dashboard/WarehouseMap";
import RealTimeStats from "@/components/dashboard/RealTimeStats";
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header warehouseCode={warehouseCode} />
      <Navigation warehouseCode={warehouseCode} />

      <main className="p-6 flex-1 min-h-0">
        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Left column: Warehouse Map (full height) */}
          <div className="min-h-0">
            <WarehouseMap warehouseCode={warehouseCode} />
          </div>

          {/* Right column: AIPredictions → RealTimeStats */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-[1.4] min-h-0">
              <AIPredictions warehouseCode={warehouseCode} />
            </div>
            <div className="flex-[1] min-h-0">
              <RealTimeStats warehouseCode={warehouseCode} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
