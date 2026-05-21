import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Package,
  AlertTriangle,
  Battery,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";

interface RealTimeStatsProps {
  warehouseCode: string;
}

interface WarehouseStatsDTO {
  warehouse_code: string;
  timestamp: string;
  metrics: {
    total_robots: number;
    active_robots: number;
    total_scans_today: number;
    low_stock_alerts: number;
    out_of_stock_alerts: number;
    total_capacity_used: string;
    battery_levels: {
      average: number;
      lowest: number;
      highest: number;
    };
  };
}

interface ActivityPoint {
  ts: string;
  count: number;
}

const RealTimeStats = ({ warehouseCode }: RealTimeStatsProps) => {
  const [stats, setStats] = useState<WarehouseStatsDTO | null>(null);
  const [activityData, setActivityData] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    warehouseCode,
    onStatsUpdate: (data: any) => {
      setStats(data);
      toast.info("Статистика обновлена в реальном времени");
    },
  });

  useEffect(() => {
    fetchRealtimeStats();
  }, [warehouseCode]);

  const fetchRealtimeStats = async () => {
    try {
      setLoading(true);
      const statsData = await apiClient.get(
        `/dashboard/warehouses/${warehouseCode}/stats`,
      );
      const warehouseStats = statsData as WarehouseStatsDTO;
      setStats(warehouseStats);

      // Generate activity series (mock for now, should come from API)
      const mockActivitySeries: ActivityPoint[] = Array.from(
        { length: 12 },
        (_, i) => {
          const date = new Date();
          date.setHours(date.getHours() - 11 + i);
          return {
            ts: date.toISOString(),
            count:
              Math.floor(
                Math.random() * (warehouseStats.metrics.active_robots + 2),
              ) + 1,
          };
        },
      );
      setActivityData(mockActivitySeries);
    } catch (error) {
      console.error("Failed to fetch realtime stats:", error);
      toast.error("Не удалось загрузить статистику в реальном времени");
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    return activityData.map((point) => ({
      time: new Date(point.ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      active: point.count,
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4 h-full">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="flex-1">
          <CardContent className="p-6">
            <div className="h-48 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4 h-full">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Не удалось загрузить статистику
          </p>
        </div>
      </div>
    );
  }

  const { metrics } = stats;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Статистика в реальном времени</CardTitle>
          <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1 text-xs">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? "Онлайн" : "Офлайн"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col gap-2 p-3">
        {/* Top row: 4 stat cards in a compact 2x2 grid */}
        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <Card className="shadow-none">
            <CardContent className="p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3 text-green-500" />
                Активные
              </div>
              <div className="text-lg font-bold">
                {metrics.active_robots}/{metrics.total_robots}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3 text-blue-500" />
                Сканирований
              </div>
              <div className="text-lg font-bold">{metrics.total_scans_today}</div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                Оповещения
              </div>
              <div className="text-lg font-bold text-red-500">
                {metrics.low_stock_alerts + metrics.out_of_stock_alerts}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Battery className="h-3 w-3 text-yellow-500" />
                Заряд
              </div>
              <div className="text-lg font-bold">
                {metrics.battery_levels
                  ? Math.round(metrics.battery_levels.average) + "%"
                  : "Н/Д"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom: Activity chart — takes remaining space */}
        <div className="flex-1 min-h-0">
          <p className="text-xs text-muted-foreground mb-1">Активность роботов (12 ч)</p>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={formatChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" fontSize={10} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="active"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeStats;
