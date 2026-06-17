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
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Статистика в реальном времени</h3>
        <Badge
          variant={isConnected ? "default" : "secondary"}
          className="flex items-center gap-1"
        >
          <>
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}{" "}
            {isConnected ? "Онлайн" : "Офлайн"}
          </>
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="mr-2 h-4 w-4 text-green-500" />
              Активные роботы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.active_robots}/{metrics.total_robots}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="mr-2 h-4 w-4 text-blue-500" />
              Сканирований сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.total_scans_today}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              Оповещения о запасах
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {metrics.low_stock_alerts + metrics.out_of_stock_alerts}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.low_stock_alerts} низкий + {metrics.out_of_stock_alerts}{" "}
              отсутствует
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Battery className="mr-2 h-4 w-4 text-yellow-500" />
              Средний заряд
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.battery_levels
                ? Math.round(metrics.battery_levels.average) + "%"
                : "Н/Д"}
            </div>
            {metrics.battery_levels && (
              <div className="text-xs text-muted-foreground">
                {metrics.battery_levels.lowest}% -{" "}
                {metrics.battery_levels.highest}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  );
};

export default RealTimeStats;
