import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingDown, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface AIPredictionsProps {
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
}

const AIPredictions = ({ warehouseCode }: AIPredictionsProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Функция для получения критичных прогнозов через REST
  const fetchCriticalPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${warehouseCode}/predict/criticality/critical`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from server");
      }

      const result = JSON.parse(text);

      if (result.status === "ok") {
        setPredictions(result.predictions || []);
        setLastUpdated(Date.now());
        toast.success(`Загружено ${result.predictions?.length || 0} критических прогнозов`);
      } else {
        toast.error(result.message || "Не удалось загрузить прогнозы");
      }
    } catch (error) {
      console.error("Failed to fetch critical predictions:", error);
      toast.error("Не удалось загрузить критические прогнозы с сервера");
    } finally {
      setLoading(false);
    }
  }, [warehouseCode]);

  // Функция для получения всех прогнозов через REST
  const fetchAllPredictions = useCallback(async () => {
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
        // Берем только критические прогнозы из всех данных
        const criticalPredictions = result.data?.CRITICAL || [];
        setPredictions(criticalPredictions);
        setLastUpdated(Date.now());
        toast.success(`Загружено ${criticalPredictions.length} критических прогнозов`);
      } else {
        toast.error(result.message || "Не удалось загрузить прогнозы");
      }
    } catch (error) {
      console.error("Failed to fetch all predictions:", error);
      toast.error("Не удалось загрузить прогнозы с сервера");
    } finally {
      setLoading(false);
    }
  }, [warehouseCode]);

  // Первоначальная загрузка данных
  useEffect(() => {
    console.log('Loading AI predictions for:', warehouseCode);
    fetchCriticalPredictions();
  }, [warehouseCode, fetchCriticalPredictions]);

  // Обработчик обновления данных
  const handleRefresh = useCallback(() => {
    toast.info("Обновление критических прогнозов...");
    fetchCriticalPredictions();
  }, [fetchCriticalPredictions]);

  // Функция для получения даты истощения запасов
  const getDepletionDate = (daysUntilStockout: number) => {
    if (daysUntilStockout <= 0) return "Сейчас";
    if (daysUntilStockout > 365) return "Более 1 года";

    const date = new Date();
    date.setDate(date.getDate() + Math.round(daysUntilStockout));
    return date.toLocaleDateString("ru-RU");
  };

  // Функция для получения иконки по уровню критичности
  const getCriticalityIcon = (criticalLevel: string) => {
    switch (criticalLevel) {
      case "CRITICAL":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "MEDIUM":
        return <XCircle className="h-4 w-4 text-yellow-500" />;
      case "OK":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Функция для получения стилей по уровню критичности
  const getCriticalityStyles = (criticalLevel: string) => {
    switch (criticalLevel) {
      case "CRITICAL":
        return "bg-red-50 dark:bg-red-950/20 border-red-500 text-red-800 dark:text-red-300";
      case "MEDIUM":
        return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500 text-yellow-800 dark:text-yellow-300";
      case "OK":
        return "bg-green-50 dark:bg-green-950/20 border-green-500 text-green-800 dark:text-green-300";
      default:
        return "bg-gray-50 dark:bg-gray-950/20 border-gray-500 text-gray-800 dark:text-gray-300";
    }
  };

  // Этот компонент отображает ТОЛЬКО критические прогнозы
  const criticalPredictions = predictions.filter(p => p.critical_level === "CRITICAL");

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Критические прогнозы ИИ - {warehouseCode}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Обновлено: {new Date(lastUpdated).toLocaleTimeString("ru-RU")}
            </span>
            <span className="text-muted-foreground">
              {criticalPredictions.length} критических позиций
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCriticalPredictions}
              disabled={loading}
            >
              Только критические
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllPredictions}
              disabled={loading}
            >
              Обновить все
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Загрузка критических прогнозов...</p>
          </div>
        ) : criticalPredictions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Нет критических прогнозов - все позиции стабильны
            </p>
          </div>
        ) : (
          criticalPredictions.map((prediction) => {
            const depletionDate = getDepletionDate(prediction.days_until_stockout);
            const styles = getCriticalityStyles(prediction.critical_level);

            return (
              <div
                key={prediction.sku}
                className={`p-4 rounded-lg border-l-4 ${styles}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getCriticalityIcon(prediction.critical_level)}
                    <div>
                      <h4 className="font-semibold">{prediction.sku}</h4>
                      <p className="text-xs opacity-75">Артикул</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">
                      {prediction.days_until_stockout <= 0
                        ? "НЕТ В НАЛИЧИИ"
                        : `${Math.round(prediction.days_until_stockout)} дн.`
                      }
                    </span>
                    <p className="text-xs opacity-75">до исчерпания</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="opacity-75 mb-1">Исчерпание</p>
                    <p className="font-semibold">{depletionDate}</p>
                  </div>
                  <div>
                    <p className="opacity-75 mb-1">Рек. заказ</p>
                    <p className="font-semibold">
                      {Math.round(prediction.recommended_order)}
                    </p>
                  </div>
                  <div>
                    <p className="opacity-75 mb-1">Уверенность</p>
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
      </CardContent>
    </Card>
  );
};

export default AIPredictions;
