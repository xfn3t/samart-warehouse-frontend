import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Warehouse,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Bot,
  Activity,
  Battery,
  AlertTriangle,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import CreateWarehouseModal from "@/components/CreateWarehouseModal";
import EditWarehouseModal from "@/components/EditWarehouseModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";

interface ExcludedCell {
  zone: number;
  row: number;
}

interface WarehouseDTO {
  id: number;
  code: string;
  name: string;
  location: string;
  zoneMaxSize: number;
  rowMaxSize: number;
  shelfMaxSize: number;
  excludedCells: ExcludedCell[];
}

interface WarehouseStatsDTO {
  warehouse_code: string;
  timestamp: string;
  metrics: {
    total_robots: number;
    active_robots: number;
    charging_robots: number;
    error_robots: number;
    total_scans_today: number;
    low_stock_alerts: number;
    out_of_stock_alerts: number;
    total_capacity_used: string;
    battery_levels: {
      average: number;
      lowest: number;
      highest: number;
    };
    robot_status_distribution: Record<string, number>;
  };
}

const WarehouseSelection = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseDTO[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<
    Record<string, WarehouseStatsDTO>
  >({});
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (warehouses.length > 0) {
      fetchAllWarehouseStats();
    }
  }, [warehouses]);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8080/api/warehouse", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Убедимся, что данные имеют правильную структуру
        const validWarehouses = data.filter(
          (warehouse: any) =>
            warehouse &&
            typeof warehouse.id === "number" &&
            typeof warehouse.code === "string" &&
            typeof warehouse.name === "string",
        );
        setWarehouses(validWarehouses);
      } else {
        throw new Error("Failed to fetch warehouses");
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
      toast.error("Не удалось загрузить склады");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWarehouseStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const stats: Record<string, WarehouseStatsDTO> = {};

      for (const warehouse of warehouses) {
        try {
          const response = await fetch(
            `http://localhost:8080/api/dashboard/warehouses/${warehouse.code}/stats`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok) {
            const statsData = await response.json();
            // Убедимся, что данные статистики имеют правильную структуру
            if (statsData && statsData.metrics) {
              stats[warehouse.code] = statsData;
            }
          }
        } catch (error) {
          console.error(
            `Failed to fetch stats for warehouse ${warehouse.code}:`,
            error,
          );
        }
      }

      setWarehouseStats(stats);
    } catch (error) {
      console.error("Failed to fetch warehouse stats:", error);
    }
  };

  const handleWarehouseSelect = (warehouseCode: string) => {
    localStorage.setItem("selectedWarehouse", warehouseCode);
    navigate(`/dashboard/${warehouseCode}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("selectedWarehouse");
    navigate("/login");
  };

  const handleWarehouseCreated = () => {
    fetchWarehouses();
    toast.success("Склад успешно создан!");
  };

  const handleWarehouseUpdated = () => {
    fetchWarehouses();
    setEditModalOpen(false);
    setSelectedWarehouse(null);
    toast.success("Склад успешно обновлён!");
  };

  const handleEditWarehouse = (warehouse: WarehouseDTO) => {
    setSelectedWarehouse(warehouse);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (warehouse: WarehouseDTO) => {
    setSelectedWarehouse(warehouse);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedWarehouse) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8080/api/warehouse/${selectedWarehouse.code}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        toast.success("Склад успешно удалён!");
        fetchWarehouses(); // Обновляем данные после удаления
        setDeleteDialogOpen(false);
        setSelectedWarehouse(null);
      } else {
        throw new Error("Failed to delete warehouse");
      }
    } catch (error) {
      console.error("Failed to delete warehouse:", error);
      toast.error("Не удалось удалить склад");
    } finally {
      setDeleting(false);
    }
  };

  const getCapacityColor = (capacity: string) => {
    try {
      const percent = parseInt(capacity.replace("%", ""));
      if (percent >= 80) return "text-red-500";
      if (percent >= 60) return "text-yellow-500";
      return "text-green-500";
    } catch {
      return "text-gray-500";
    }
  };

  const getAlertColor = (alerts: number) => {
    if (alerts > 10) return "text-red-500";
    if (alerts > 5) return "text-yellow-500";
    return "text-green-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Загрузка складов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Управление складами</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-4 space-y-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => navigate("/warehouses")}
            >
              <Warehouse className="mr-2 h-4 w-4" />
              Склады
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/robots")}
            >
              <Bot className="mr-2 h-4 w-4" />
              Роботы
            </Button>
            {isAdmin && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/users")}
            >
              <Users className="mr-2 h-4 w-4" />
              Пользователи
            </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Все склады</h2>
              <p className="text-gray-600">
                Управляйте расположением складов и отслеживайте их состояние
              </p>
            </div>
            {isAdmin && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Создать склад
            </Button>
          )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Add Warehouse Card */}
            {isAdmin && (
            <Card
              className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors bg-gradient-to-br from-gray-50 to-gray-100"
              onClick={() => setCreateModalOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center h-40 p-6">
                <Plus className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-lg font-medium text-gray-600 text-center">
                  Создать новый склад
                </p>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Добавить новое расположение склада
                </p>
              </CardContent>
            </Card>
            )}

            {/* Existing Warehouses */}
            {warehouses.map((warehouse) => {
              const stats = warehouseStats[warehouse.code];
              const totalAlerts = stats
                ? stats.metrics.low_stock_alerts +
                  stats.metrics.out_of_stock_alerts
                : 0;

              return (
                <Card
                  key={warehouse.id}
                  className="hover:shadow-lg transition-shadow relative group bg-gradient-to-br from-white to-blue-50 border-blue-100"
                >
                  {/* Action buttons */}
                  {isAdmin && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
                      onClick={() => handleEditWarehouse(warehouse)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDeleteClick(warehouse)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  )}

                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Warehouse className="h-5 w-5 text-blue-600" />
                      {warehouse.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Код:</strong> {warehouse.code}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Местоположение:</strong>{" "}
                        {warehouse.location || "Не указано"}
                      </p>
                    </div>

                    {/* Warehouse Layout */}
                    <div className="bg-blue-50 rounded-lg p-3 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                        <div className="text-center">
                          <div className="font-bold text-blue-700 text-lg">
                            {warehouse.zoneMaxSize}
                          </div>
                          <div>Зоны</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-700 text-lg">
                            {warehouse.rowMaxSize}
                          </div>
                          <div>Ряды</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-700 text-lg">
                            {warehouse.shelfMaxSize}
                          </div>
                          <div>Полки</div>
                        </div>
                      </div>

                      {/* Mini schematic */}
                      <div className="flex justify-center">
                        <div
                          className="grid gap-[1px]"
                          style={{
                            gridTemplateColumns: `repeat(${warehouse.zoneMaxSize}, 10px)`,
                            gridTemplateRows: `repeat(${warehouse.rowMaxSize}, 10px)`,
                          }}
                        >
                          {Array.from({ length: warehouse.rowMaxSize }).flatMap(
                            (_, ri) =>
                              Array.from({ length: warehouse.zoneMaxSize }).map(
                                (_, zi) => {
                                  const isExcluded =
                                    warehouse.excludedCells?.some(
                                      (c: ExcludedCell) =>
                                        c.zone === zi + 1 && c.row === ri + 1,
                                    );
                                  if (isExcluded)
                                    return <div key={`${zi + 1}-${ri + 1}`} />;
                                  return (
                                    <div
                                      key={`${zi + 1}-${ri + 1}`}
                                      className="bg-blue-200 rounded-sm"
                                    />
                                  );
                                },
                              ),
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    {stats && (
                      <div className="space-y-3 border-t pt-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Bot className="h-3 w-3 text-blue-500" />
                            <span>Роботы:</span>
                            <span className="font-semibold">
                              {stats.metrics.total_robots}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-green-500" />
                            <span>Активные:</span>
                            <span className="font-semibold">
                              {stats.metrics.active_robots}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Battery className="h-3 w-3 text-yellow-500" />
                            <span>Батарея:</span>
                            <span className="font-semibold">
                              {stats.metrics.battery_levels
                                ? Math.round(
                                    stats.metrics.battery_levels.average,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-purple-500" />
                            <span>Сканирования:</span>
                            <span className="font-semibold">
                              {stats.metrics.total_scans_today}
                            </span>
                          </div>
                        </div>

                        {/* Capacity and Alerts */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Заполненность:</span>
                              <span
                                className={`font-semibold ${getCapacityColor(stats.metrics.total_capacity_used)}`}
                              >
                                {stats.metrics.total_capacity_used}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  parseInt(
                                    stats.metrics.total_capacity_used.replace(
                                      "%",
                                      "",
                                    ),
                                  ) >= 80
                                    ? "bg-red-500"
                                    : parseInt(
                                          stats.metrics.total_capacity_used.replace(
                                            "%",
                                            "",
                                          ),
                                        ) >= 60
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                                style={{
                                  width: stats.metrics.total_capacity_used,
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Оповещения:</span>
                              <span
                                className={`font-semibold ${getAlertColor(totalAlerts)}`}
                              >
                                {totalAlerts}
                              </span>
                            </div>
                            {totalAlerts > 0 && (
                              <div className="flex items-center gap-1 text-red-500">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs">
                                  Требуется внимание
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!stats && (
                      <div className="text-center py-2 text-gray-500 text-xs">
                        Загрузка статистики...
                      </div>
                    )}

                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleWarehouseSelect(warehouse.code)}
                    >
                      Войти на склад
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {warehouses.length === 0 && (
            <div className="text-center py-12">
              <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Склады не найдены
              </h3>
              <p className="text-gray-500 mb-6">
                Начните работу, создав свой первый склад
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать первый склад
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Create Warehouse Modal */}
      <CreateWarehouseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onWarehouseCreated={handleWarehouseCreated}
      />

      {/* Edit Warehouse Modal */}
      <EditWarehouseModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedWarehouse(null);
        }}
        onWarehouseUpdated={handleWarehouseUpdated}
        warehouse={selectedWarehouse}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Удалить склад"
        description={`Вы уверены, что хотите удалить склад "${selectedWarehouse?.name}" (${selectedWarehouse?.code})? Это действие нельзя отменить, и все данные, связанные с этим складом, будут безвозвратно удалены.`}
        confirmText="Удалить склад"
        cancelText="Отмена"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
};

export default WarehouseSelection;
