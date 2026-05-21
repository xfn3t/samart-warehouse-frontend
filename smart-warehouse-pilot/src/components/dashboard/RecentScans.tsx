import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, Wifi, WifiOff, Package, MapPin } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";

interface RecentScansProps {
  warehouseCode: string;
}

interface Scan {
  id: string;
  robot_id: string;
  productCode: string;
  productName: string;
  quantity: number;
  status: "OK" | "LOW_STOCK" | "CRITICAL";
  diff: number;
  scannedAt: string;
  zone?: number;
  row?: number;
  shelf?: number;
}

const RecentScans = ({ warehouseCode }: RecentScansProps) => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedScansRef = useRef<Set<string>>(new Set());

  // Функция для создания уникального ID сканирования
  const getScanId = (scan: any, robotId: string) => {
    return `${robotId}-${scan.productCode}-${scan.scannedAt}`;
  };

  // Функция для добавления новых сканирований
  const addNewScans = useCallback((robotData: any) => {
    if (!robotData.recent_scans || !Array.isArray(robotData.recent_scans)) return;

    const newScans: Scan[] = [];

    robotData.recent_scans.forEach((scan: any) => {
      const scanId = getScanId(scan, robotData.robot_id);

      if (!processedScansRef.current.has(scanId)) {
        processedScansRef.current.add(scanId);

        // Обеспечиваем, что все поля являются примитивами, а не объектами
        newScans.push({
          id: scanId,
          robot_id: String(robotData.robot_id || ""),
          productCode: String(scan.productCode || "Н/Д"),
                    productName: String(scan.productName || "Неизвестный товар"),
          quantity: Number(scan.quantity || 0),
          status: (scan.status && typeof scan.status === 'string') ?
            (scan.status as "OK" | "LOW_STOCK" | "CRITICAL") : "OK",
          diff: Number(scan.diff || 0),
          scannedAt: String(scan.scannedAt || new Date().toISOString()),
          zone: scan.zone ? Number(scan.zone) : undefined,
          row: scan.row ? Number(scan.row) : undefined,
          shelf: scan.shelf ? Number(scan.shelf) : undefined
        });
      }
    });

    if (newScans.length > 0) {
      setScans(prev => {
        const updated = [...newScans, ...prev];
        return updated.slice(0, 100);
      });
    }
  }, [warehouseCode]);

  // WebSocket для реальных данных о сканированиях
  const { isConnected, connectionStatus } = useWebSocket({
    warehouseCode,
    onRobotUpdate: useCallback((data: any) => {
      if (paused) return;

      console.log('Received robot update with scans:', data);

      // Убедимся, что данные имеют правильную структуру
      if (data && data.recent_scans && Array.isArray(data.recent_scans) && data.recent_scans.length > 0) {
        addNewScans(data);
        setLoading(false);

        // Показываем уведомления
        if (data.recent_scans.length === 1) {
          const scan = data.recent_scans[0];
          toast.info(`Новое сканирование: ${scan.productName || 'Неизвестный товар'}`, {
            description: `Робот ${data.robot_id} отсканировал ${scan.quantity || 0} поз.`
          });
        } else {
          toast.info(`Новые сканирования от робота ${data.robot_id}`, {
            description: `Отсканировано позиций: ${data.recent_scans.length}`
          });
        }
      }
    }, [paused, addNewScans])
  });

  useEffect(() => {
    // Очищаем историю processed scans при смене склада
    processedScansRef.current.clear();
    setScans([]);
    setLoading(true);
  }, [warehouseCode]);

  useEffect(() => {
    if (scrollRef.current && !paused && scans.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [scans, paused]);

  const getStatusBadge = (status: Scan["status"]) => {
    // Убедимся, что status - это строка
    const statusText = typeof status === 'string' ? status : 'OK';

    switch (statusText) {
      case "OK":
        return <Badge className="bg-green-500 text-white">OK</Badge>;
      case "LOW_STOCK":
        return <Badge className="bg-yellow-500 text-white">Низкий запас</Badge>;
      case "CRITICAL":
        return <Badge className="bg-red-500 text-white">Критический</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{statusText}</Badge>;
    }
  };

  const getStatusColor = (status: Scan["status"]) => {
    const statusText = typeof status === 'string' ? status : 'OK';

    switch (statusText) {
      case "OK":
        return "text-green-600";
      case "LOW_STOCK":
        return "text-yellow-600";
      case "CRITICAL":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBgColor = (status: Scan["status"]) => {
    const statusText = typeof status === 'string' ? status : 'OK';

    switch (statusText) {
      case "OK":
        return "bg-green-50 border-green-200";
      case "LOW_STOCK":
        return "bg-yellow-50 border-yellow-200";
      case "CRITICAL":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Только что";
      if (diffMins < 60) return `${diffMins} мин. назад`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ч. назад`;

      return date.toLocaleDateString("ru-RU", {
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return "Некорректное время";
    }
  };

  const formatDetailedTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("ru-RU", {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return "Некорректное время";
    }
  };

  const handleScanClick = (scan: Scan) => {
    toast.info(`Детали сканирования: ${scan.productName}`, {
      description: (
        <div className="text-sm space-y-1">
          <div><strong>Робот:</strong> {scan.robot_id}</div>
          <div><strong>Товар:</strong> {scan.productCode}</div>
          <div><strong>Количество:</strong> {scan.quantity} поз.</div>
          <div><strong>Статус:</strong> {scan.status}</div>
          <div><strong>Разница:</strong> {scan.diff > 0 ? '+' : ''}{scan.diff}</div>
          {scan.zone && <div><strong>Местоположение:</strong> Зона {scan.zone}, Ряд {scan.row}, Полка {scan.shelf}</div>}
          <div><strong>Время:</strong> {new Date(scan.scannedAt).toLocaleString("ru-RU")}</div>
        </div>
      ),
      duration: 5000
    });
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Последние сканирования - {warehouseCode}</CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <WifiOff className="h-3 w-3" />
              Подключение...
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-3 bg-card animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-12"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Последние сканирования - {warehouseCode}</CardTitle>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="flex items-center gap-1 text-xs"
            >
              <>{isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} {isConnected ? "Онлайн" : "Офлайн"}</>
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPaused(!paused)}
            disabled={!isConnected}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground flex justify-between">
          <span>{scans.length} сканирований</span>
          {scans.length > 0 && (
            <span>Последнее: {formatTime(scans[0].scannedAt)}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto space-y-2 pr-2">
          {scans.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="mb-2">Сканирования пока отсутствуют</div>
              <div className="text-xs">Данные сканирования появятся здесь, когда роботы начнут работу</div>
              {!isConnected && (
                <div className="text-xs text-yellow-600 mt-2">
                  Ожидание подключения WebSocket...
                </div>
              )}
            </div>
          ) : (
            scans.map((scan) => (
              <div
                key={scan.id}
                className={`border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md ${getStatusBgColor(scan.status)}`}
                onClick={() => handleScanClick(scan)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        Робот {scan.robot_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(scan.scannedAt)}
                      </div>
                    </div>
                    {scan.zone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        Зона {scan.zone}, Ряд {scan.row}, Полка {scan.shelf}
                      </div>
                    )}
                  </div>
                  {getStatusBadge(scan.status)}
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground line-clamp-1">
                      {scan.productName}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {scan.productCode}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Количество</div>
                      <div className={`font-bold ${getStatusColor(scan.status)}`}>
                        {scan.quantity}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Разница</div>
                      <div className={`font-bold ${
                        scan.diff > 0 ? 'text-green-600' :
                        scan.diff < 0 ? 'text-red-600' :
                        'text-foreground'
                      }`}>
                        {scan.diff > 0 ? '+' : ''}{scan.diff}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Время</div>
                      <div className="font-medium text-foreground">
                        {formatDetailedTime(scan.scannedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentScans;
