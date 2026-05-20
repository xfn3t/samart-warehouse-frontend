import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Info, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";

interface WarehouseMapProps {
  warehouseCode: string;
}

interface Warehouse {
  id: number;
  code: string;
  name: string;
  zoneMaxSize: number;
  rowMaxSize: number;
  shelfMaxSize: number;
  location: string;
}

interface Location {
  location_id: string;
  zone: number;
  row: number;
  shelf: number;
  total_products: number;
  capacity_percent: number;
  last_scan: string;
  metrics?: {
    total_items: number;
    scanned_today: number;
    low_stock_items: number;
    out_of_stock_items: number;
  };
}

interface Robot {
  robot_id: string;
  status: string;
  battery_level: number;
  zone: number;
  row: number;
  shelf: number;
  last_update: string;
}

interface WarehouseLocationsDTO {
  warehouse_code: string;
  locations: Location[];
}

interface WarehouseRobotsDTO {
  warehouse_code: string;
  robots: Robot[];
}

const WarehouseMap = ({ warehouseCode }: WarehouseMapProps) => {
  const [zoom, setZoom] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<{zone: number, row: number} | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    warehouseCode,
    onLocationUpdate: (data: any) => {
      if (data.locations) {
        setLocations(data.locations);
        toast.info('Местоположения обновлены в реальном времени');
      }
    },
    onWarehouseRobotsUpdate: (data: any) => {
      if (data.robots) {
        setRobots(data.robots);
        toast.info('Позиции роботов обновлены');
      }
    },
    onRobotUpdate: (data: any) => {
      // Update specific robot position
      setRobots(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(r => r.robot_id === data.robot_id);

        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            zone: data.zone,
            row: data.row,
            shelf: data.shelf,
            battery_level: data.battery_level,
            status: data.status,
            last_update: data.timestamp
          };
        } else {
          updated.push({
            robot_id: data.robot_id,
            status: data.status || 'WORKING',
            battery_level: data.battery_level,
            zone: data.zone,
            row: data.row,
            shelf: data.shelf,
            last_update: data.timestamp
          });
        }

        return updated;
      });
    }
  });

  useEffect(() => {
    fetchWarehouseData();
  }, [warehouseCode]);

  const fetchWarehouseData = async () => {
    try {
      setLoading(true);

      // Get warehouse data
      const warehouses = await apiClient.get('/warehouse');
      const currentWarehouse = warehouses.find((w: Warehouse) => w.code === warehouseCode);
      setWarehouse(currentWarehouse);

      if (currentWarehouse) {
        await fetchRealData(currentWarehouse);
      }
    } catch (error) {
      console.error('Failed to fetch warehouse data:', error);
      toast.error("Не удалось загрузить данные карты склада");
    } finally {
      setLoading(false);
    }
  };

  const fetchRealData = async (warehouse: Warehouse) => {
    try {
      // Load initial data via REST API
      const [locationsResponse, robotsResponse] = await Promise.all([
        apiClient.get(`/dashboard/warehouses/${warehouseCode}/locations`),
        apiClient.get(`/dashboard/warehouses/${warehouseCode}/robots`)
      ]);

      const locationsData = locationsResponse as WarehouseLocationsDTO;
      const robotsData = robotsResponse as WarehouseRobotsDTO;

      setLocations(locationsData.locations || []);
      setRobots(robotsData.robots || []);
    } catch (error) {
      console.error('Failed to fetch real data:', error);
      toast.error("Не удалось загрузить данные о местоположениях и роботах");
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchWarehouseData();
      toast.success("Данные карты обновлены");
    } catch (error) {
      toast.error("Не удалось обновить данные");
    }
  };

  const getCellColor = (location: Location | undefined) => {
    if (!location) return "bg-gray-100 border-gray-300";

    const lastScanTime = new Date(location.last_scan).getTime();
    const now = Date.now();
    const hoursSinceLastScan = (now - lastScanTime) / (1000 * 60 * 60);

    if (hoursSinceLastScan < 1) return "bg-green-100 border-green-400";
    if (hoursSinceLastScan < 4) return "bg-yellow-100 border-yellow-400";
    if (hoursSinceLastScan < 12) return "bg-orange-100 border-orange-400";
    return "bg-red-100 border-red-400";
  };

  const getRobotColor = (status: string) => {
    switch (status) {
      case "WORKING":
        return "bg-blue-500";
      case "CHARGING":
        return "bg-green-500";
      case "IDLE":
        return "bg-gray-500";
      case "MAINTENANCE":
        return "bg-red-500";
      default:
        return "bg-purple-500";
    }
  };

  const getRobotStatusText = (status: string) => {
    switch (status) {
      case "WORKING":
        return "Работает";
      case "CHARGING":
        return "Заряжается";
      case "IDLE":
        return "Ожидание";
      case "MAINTENANCE":
        return "Обслуживание";
      default:
        return status;
    }
  };

  const russianPlural = (n: number, one: string, few: string, many: string) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
    return `${n} ${many}`;
  };

  const formatLastScan = (lastScan: string) => {
    const date = new Date(lastScan);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return "Менее 1 часа назад";
    if (diffHours < 24) return `${russianPlural(diffHours, 'час', 'часа', 'часов')} назад`;

    const diffDays = Math.floor(diffHours / 24);
    return `${russianPlural(diffDays, 'день', 'дня', 'дней')} назад`;
  };

  const getLocationAt = (zone: number, row: number) => {
    return locations.find(loc => loc.zone === zone && loc.row === row);
  };

  const getRobotAt = (zone: number, row: number) => {
    return robots.find(robot => robot.zone === zone && robot.row === row);
  };

  const CELL_SIZE = 60;

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin mr-2" />
            <p>Загрузка карты склада...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!warehouse) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-64">
            <p>Данные склада не найдены для {warehouseCode}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle>Карта склада - {warehouseCode}</CardTitle>
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Онлайн" : "Офлайн"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(1)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] relative overflow-auto">
        <TooltipProvider>
          <div
            className="inline-block p-4"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            {/* Matrix Grid */}
            <div className="grid gap-1" style={{
              gridTemplateColumns: `repeat(${warehouse.zoneMaxSize}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${warehouse.rowMaxSize}, ${CELL_SIZE}px)`
            }}>
              {Array.from({ length: warehouse.rowMaxSize }).map((_, rowIdx) =>
                Array.from({ length: warehouse.zoneMaxSize }).map((_, zoneIdx) => {
                  const zone = zoneIdx + 1;
                  const row = rowIdx + 1;
                  const location = getLocationAt(zone, row);
                  const robot = getRobotAt(zone, row);

                  return (
                    <Tooltip key={`${zone}-${row}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`border-2 rounded flex items-center justify-center relative transition-all ${getCellColor(location)}`}
                          style={{ width: CELL_SIZE, height: CELL_SIZE }}
                          onMouseEnter={() => setHoveredCell({zone, row})}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className="text-xs text-center p-1">
                            <div className="font-semibold">{zone}-{row}</div>
                            {location && (
                              <div className="text-[10px] opacity-75">
                                {location.capacity_percent}%
                              </div>
                            )}
                          </div>

                          {robot && (
                            <div
                              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getRobotColor(robot.status)} border-2 border-white`}
                              title={`Робот ${robot.robot_id} (${getRobotStatusText(robot.status)})`}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="w-80">
                        {location ? (
                          <div className="space-y-2">
                            <div className="font-semibold">Местоположение {zone}-{row}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Последнее сканирование:</span>
                                <div className="font-medium">{formatLastScan(location.last_scan)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Всего товаров:</span>
                                <div className="font-medium">{location.total_products}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Заполненность:</span>
                                <div className="font-medium">{location.capacity_percent}%</div>
                              </div>
                              {location.metrics && (
                                <>
                                  <div>
                                    <span className="text-muted-foreground">Отсканировано сегодня:</span>
                                    <div className="font-medium">{location.metrics.scanned_today}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Низкий запас:</span>
                                    <div className="font-medium text-yellow-600">{location.metrics.low_stock_items}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Нет в наличии:</span>
                                    <div className="font-medium text-red-600">{location.metrics.out_of_stock_items}</div>
                                  </div>
                                </>
                              )}
                            </div>
                            {robot && (
                              <div className="pt-2 border-t">
                                <div className="font-semibold flex items-center gap-2">
                                  <Info className="h-3 w-3" />
                                  Робот {robot.robot_id}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Статус:</span>
                                    <div className="font-medium">{getRobotStatusText(robot.status)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Батарея:</span>
                                    <div className="font-medium">{robot.battery_level}%</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold">Местоположение {zone}-{row}</div>
                            <div className="text-sm text-muted-foreground">Нет данных сканирования</div>
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 bg-card border rounded-lg">
              <p className="font-semibold mb-3 text-sm">Легенда:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
                  <span>Отсканировано &lt; 1 часа назад</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
                  <span>Отсканировано 1-4 часа назад</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-100 border-2 border-orange-400 rounded"></div>
                  <span>Отсканировано 4-12 часов назад</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
                  <span>Отсканировано &gt; 12 часов назад</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
                  <span>Нет данных</span>
                </div>
              </div>

              <p className="font-semibold mt-4 mb-3 text-sm">Статус робота:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Работает</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Заряжается</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span>Ожидание</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Обслуживание</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default WarehouseMap;
