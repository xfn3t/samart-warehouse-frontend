import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Package, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface StockDepletionForecastProps {
  warehouseCode: string;
}

interface Prediction {
  sku: string;
  days_until_stockout: number;
  recommended_order: number;
  confidence_score: number;
  critical_level: "CRITICAL" | "MEDIUM" | "OK";
  warehouse_code: string;
  last_updated: number;
  product_name?: string;
}

const StockDepletionForecast = ({ warehouseCode }: StockDepletionForecastProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Функция для получения критичных и средних прогнозов
  const fetchCriticalAndMediumPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${warehouseCode}/predict/criticality`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from server");
      }

      const result = JSON.parse(text);

      if (result.status === "ok") {
        // Берем только критические и средние прогнозы
        const criticalAndMediumPredictions = [
          ...(result.data?.CRITICAL || []),
          ...(result.data?.MEDIUM || [])
        ];
        setPredictions(criticalAndMediumPredictions);
        setLastUpdated(Date.now());
        toast.success(`Загружено ${criticalAndMediumPredictions.length} критических и средних прогнозов`);
      } else {
        toast.error(result.message || "Не удалось загрузить прогнозы");
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error);
      toast.error("Не удалось загрузить прогнозы с сервера");
    } finally {
      setLoading(false);
    }
  }, [warehouseCode]);

  // Первоначальная загрузка данных
  useEffect(() => {
    console.log('Loading stock depletion forecast for:', warehouseCode);
    fetchCriticalAndMediumPredictions();
  }, [warehouseCode, fetchCriticalAndMediumPredictions]);

  // Обработчик обновления данных
  const handleRefresh = useCallback(() => {
    toast.info("Обновление прогноза исчерпания...");
    fetchCriticalAndMediumPredictions();
  }, [fetchCriticalAndMediumPredictions]);

  const getDepletionDate = (daysUntilStockout: number) => {
    if (daysUntilStockout <= 0) return "Сейчас";
    if (daysUntilStockout > 365) return "Более 1 года";

    const date = new Date();
    date.setDate(date.getDate() + Math.round(daysUntilStockout));
    return date.toLocaleDateString("ru-RU");
  };

  const getUrgencyColor = (criticalLevel: string, daysUntilStockout: number) => {
    if (criticalLevel === "CRITICAL" || daysUntilStockout <= 3) return "text-red-500";
    if (criticalLevel === "MEDIUM" || daysUntilStockout <= 7) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const getCriticalityIcon = (criticalLevel: string) => {
    switch (criticalLevel) {
      case "CRITICAL":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "MEDIUM":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Сортируем прогнозы: сначала критические, потом средние, по дням до истощения (по возрастанию)
  const sortedPredictions = [...predictions].sort((a, b) => {
    // Сначала по критичности
    if (a.critical_level === "CRITICAL" && b.critical_level !== "CRITICAL") return -1;
    if (a.critical_level !== "CRITICAL" && b.critical_level === "CRITICAL") return 1;

    // Потом по дням до истощения
    return a.days_until_stockout - b.days_until_stockout;
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Прогноз исчерпания запасов - {warehouseCode}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Обновлено: {new Date(lastUpdated).toLocaleTimeString("ru-RU")}
            </span>
            <span className="text-muted-foreground">
              {sortedPredictions.length} позиций под угрозой
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Загрузка прогноза исчерпания...</p>
          </div>
        ) : sortedPredictions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Нет позиций с критическим или средним риском
            </p>
          </div>
        ) : (
          sortedPredictions.slice(0, 5).map((prediction) => {
            const daysLeft = prediction.days_until_stockout;
            const depletionDate = getDepletionDate(daysLeft);
            const urgencyColor = getUrgencyColor(prediction.critical_level, daysLeft);

            return (
              <div key={prediction.sku} className="p-3 border rounded-lg bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {getCriticalityIcon(prediction.critical_level)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{prediction.sku}</p>
                      <p className="text-xs text-muted-foreground">
                        {prediction.product_name || "Товар"}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right ${urgencyColor}`}>
                    <span className="text-sm font-semibold">
                      {daysLeft <= 0
                        ? "НЕТ В НАЛИЧИИ"
                        : `${Math.round(daysLeft)} дн.`
                      }
                    </span>
                    <p className="text-xs opacity-75">до исчерпания</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Исчерпание</p>
                    <p className="font-semibold">{depletionDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Рек. заказ</p>
                    <p className="font-semibold">
                      {Math.round(prediction.recommended_order)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Уверенность</p>
                    <p className="font-semibold">
                      {Math.round(prediction.confidence_score * 100)}%
                    </p>
                  </div>
                </div>

                {prediction.last_updated && (
                  <div className="mt-2 pt-2 border-t border-opacity-20">
                    <p className="text-xs opacity-60">
                      Обновлено: {new Date(prediction.last_updated).toLocaleTimeString("ru-RU")}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Статистика по уровням критичности */}
        {sortedPredictions.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                Показано: {sortedPredictions.length} позиций
              </span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  КРИТИЧЕСКИЕ: {sortedPredictions.filter(p => p.critical_level === "CRITICAL").length}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  СРЕДНИЕ: {sortedPredictions.filter(p => p.critical_level === "MEDIUM").length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockDepletionForecast;
