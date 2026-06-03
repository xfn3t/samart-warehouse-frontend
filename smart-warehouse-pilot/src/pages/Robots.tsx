import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Plus, LogOut, Warehouse, RefreshCw, Edit, Trash2, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import CreateRobotModal from "@/components/CreateRobotModal";
import EditRobotModal from "@/components/EditRobotModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";

interface RobotDTO {
  id: number;
  code: string;
  status: string;
  batteryLevel: number;
  currentZone: number;
  currentRow: number;
  currentShelf: number;
  warehouseCode: string;
  lastUpdate: string;
}

interface WarehouseDTO {
  id: number;
  code: string;
  name: string;
}

const Robots = () => {
  const navigate = useNavigate();
  const [robots, setRobots] = useState<RobotDTO[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<RobotDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (warehouses.length > 0) {
      fetchAllRobots();
    }
  }, [warehouses]);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/warehouse', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      } else {
        throw new Error('Failed to fetch warehouses');
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setLoading(false);
    }
  };

  const fetchAllRobots = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const allRobots: RobotDTO[] = [];

      for (const warehouse of warehouses) {
        try {
          const response = await fetch(`http://localhost:8080/api/robots/warehouse/${warehouse.code}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const robotsData = await response.json();
            allRobots.push(...robotsData);
          }
        } catch (error) {
          console.error(`Failed to fetch robots for warehouse ${warehouse.code}:`, error);
        }
      }

      setRobots(allRobots);
    } catch (error) {
      console.error('Failed to fetch robots:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedWarehouse');
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchAllRobots();
    toast.info("Обновление данных роботов...");
  };

  const handleRobotCreated = () => {
    fetchAllRobots();
    toast.success("Робот успешно создан!");
  };

  const handleRobotUpdated = () => {
    fetchAllRobots();
    setEditModalOpen(false);
    setSelectedRobot(null);
    toast.success("Робот успешно обновлён!");
  };

  const handleEditRobot = (robot: RobotDTO) => {
    setSelectedRobot(robot);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (robot: RobotDTO) => {
    setSelectedRobot(robot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRobot) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/robots/${selectedRobot.code}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Робот успешно удалён!");
        fetchAllRobots(); // Обновляем данные после удаления
        setDeleteDialogOpen(false);
        setSelectedRobot(null);
      } else {
        throw new Error('Failed to delete robot');
      }
    } catch (error) {
      console.error('Failed to delete robot:', error);
      toast.error("Не удалось удалить робота");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WORKING":
        return "bg-green-100 text-green-800";
      case "IDLE":
        return "bg-blue-100 text-blue-800";
      case "CHARGING":
        return "bg-yellow-100 text-yellow-800";
      case "MAINTENANCE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "WORKING":
        return "🟢";
      case "IDLE":
        return "🔵";
      case "CHARGING":
        return "🟡";
      case "MAINTENANCE":
        return "🔴";
      default:
        return "⚪";
    }
  };

  // Статистика по роботам
  const robotStats = {
    total: robots.length,
    working: robots.filter(r => r.status === "WORKING").length,
    idle: robots.filter(r => r.status === "IDLE").length,
    charging: robots.filter(r => r.status === "CHARGING").length,
    maintenance: robots.filter(r => r.status === "MAINTENANCE").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Загрузка роботов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Управление роботами</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Все роботы</h2>
              <p className="text-gray-600">
                Управление роботами на {warehouses.length} складах
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Зарегистрировать робота
              </Button>
            </div>
          </div>

          {/* Statistics */}
          {robots.length > 0 && (
            <div className="grid grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800">{robotStats.total}</div>
                  <div className="text-sm text-gray-600">Всего роботов</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{robotStats.working}</div>
                  <div className="text-sm text-gray-600">Работает</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{robotStats.idle}</div>
                  <div className="text-sm text-gray-600">Ожидание</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{robotStats.charging}</div>
                  <div className="text-sm text-gray-600">Зарядка</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{robotStats.maintenance}</div>
                  <div className="text-sm text-gray-600">Обслуживание</div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Add Robot Card */}
            <Card
              className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => setCreateModalOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center h-40 p-6">
                <Plus className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-lg font-medium text-gray-600 text-center">
                  Зарегистрировать нового робота
                </p>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Добавить нового робота на любой склад
                </p>
              </CardContent>
            </Card>

            {/* Existing Robots */}
            {robots.map((robot) => (
              <Card key={robot.id} className="hover:shadow-lg transition-shadow relative group">
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
                    onClick={() => handleEditRobot(robot)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDeleteClick(robot)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="h-5 w-5" />
                    {robot.code}
                    <span className="text-lg">{getStatusIcon(robot.status)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Статус:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(robot.status)}`}>
                      {robot.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Батарея:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            robot.batteryLevel > 70 ? 'bg-green-500' :
                            robot.batteryLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${robot.batteryLevel}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{robot.batteryLevel}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Склад:</span>
                    <span className="text-sm font-medium">{robot.warehouseCode}</span>
                  </div>

                  {(robot.currentZone !== null || robot.currentRow !== null || robot.currentShelf !== null) && (
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mt-3">
                      <div className="text-center">
                        <div className="font-semibold">Зона</div>
                        <div>{robot.currentZone ?? "-"}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Ряд</div>
                        <div>{robot.currentRow ?? "-"}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Полка</div>
                        <div>{robot.currentShelf ?? "-"}</div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Последнее обновление: {new Date(robot.lastUpdate).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {robots.length === 0 && warehouses.length > 0 && (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Роботы не найдены
              </h3>
              <p className="text-gray-500 mb-6">
                Начните работу, зарегистрировав первого робота
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Зарегистрировать первого робота
              </Button>
            </div>
          )}

          {warehouses.length === 0 && (
            <div className="text-center py-12">
              <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Склады не найдены
              </h3>
              <p className="text-gray-500 mb-6">
                Сначала необходимо создать склад перед регистрацией роботов
              </p>
              <Button onClick={() => navigate('/warehouses')}>
                <Warehouse className="mr-2 h-4 w-4" />
                Создать склад
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Create Robot Modal */}
      <CreateRobotModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onRobotCreated={handleRobotCreated}
      />

      {/* Edit Robot Modal */}
      <EditRobotModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedRobot(null);
        }}
        onRobotUpdated={handleRobotUpdated}
        robot={selectedRobot}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Удалить робота"
        description={`Вы уверены, что хотите удалить робота "${selectedRobot?.code}"? Это действие нельзя отменить, и все данные, связанные с этим роботом, будут безвозвратно удалены.`}
        confirmText="Удалить робота"
        cancelText="Отмена"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
};

export default Robots;
